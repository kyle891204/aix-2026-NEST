package com.aix.team03.notices;

import com.aix.team03.integrations.school.SchoolNoticeCollector;
import com.aix.team03.integrations.school.SchoolNoticeModels.SchoolNotice;
import com.aix.team03.notices.NoticeModels.Notice;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Primary;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Repository;

/**
 * 학교 게시판에서 수집한 실제 공지를 서버 메모리에 둔다. DB가 없어 재시작하면 다시 수집한다.
 * 서버가 켜지면 바로 수집을 시작한다. 목록만 먼저 읽어 보여주고, 본문은 백그라운드에서 게시판별로 채운다.
 * 1시간이 지난 목록은 조회를 막지 않고 다시 읽으며, 본문을 이미 읽은 공지는 상세를 다시 읽지 않는다.
 * 아직 한 번도 목록을 읽지 못했으면 1시간을 기다리지 않고 1분 뒤 조회에서 다시 수집한다.
 * 샘플 공지는 수집을 끈 경우(테스트, 오프라인 개발)에만 쓴다.
 */
@Primary
@Repository
public class CollectedNoticeRepository implements NoticeRepository {
    private static final Logger log = LoggerFactory.getLogger(CollectedNoticeRepository.class);
    private static final Duration REFRESH_AFTER = Duration.ofHours(1);
    private static final Duration RETRY_AFTER = Duration.ofMinutes(1);

    private final SampleNoticeRepository samples;
    private final SchoolNoticeCollector collector;
    private final boolean enabled;
    private final Executor executor;
    private final Clock clock;
    private final AtomicBoolean refreshing = new AtomicBoolean();
    private volatile List<SchoolNotice> school = List.of();
    private volatile List<Notice> collected = List.of();
    private volatile Instant collectedAt;

    @Autowired
    public CollectedNoticeRepository(SampleNoticeRepository samples, SchoolNoticeCollector collector,
            @Value("${NOTICE_COLLECTION_ENABLED:true}") boolean enabled) {
        this(samples, collector, enabled, Executors.newSingleThreadExecutor(runnable -> {
            var thread = new Thread(runnable, "school-notice-collector");
            thread.setDaemon(true);
            return thread;
        }), Clock.systemUTC());
    }

    CollectedNoticeRepository(SampleNoticeRepository samples, SchoolNoticeCollector collector, boolean enabled,
            Executor executor, Clock clock) {
        this.samples = samples;
        this.collector = collector;
        this.enabled = enabled;
        this.executor = executor;
        this.clock = clock;
    }

    /** 첫 사용자가 수집을 기다리지 않도록 서버가 켜지자마자 수집을 시작한다. */
    @EventListener(ApplicationReadyEvent.class)
    public void collectOnStartup() {
        if (!enabled) return;
        executor.execute(this::ensureCollected);
    }

    @Override
    public List<Notice> findAll() {
        if (!enabled) return samples.findAll();
        var current = ensureCollected();
        if (current.isEmpty()) throw new NoticeSourceUnavailableException();
        return current;
    }

    @Override
    public Optional<Notice> findById(String noticeId) {
        if (!enabled) return samples.findById(noticeId);
        return ensureCollected().stream().filter(notice -> notice.noticeId().equals(noticeId)).findFirst();
    }

    private List<Notice> ensureCollected() {
        if (needsFirstList()) {
            // 첫 수집은 동시에 들어온 요청이 한 번만 하도록 잠그고, 나머지는 목록이 나올 때까지 기다린다.
            synchronized (this) {
                if (needsFirstList()) refresh();
            }
        } else if (collectedAt.plus(REFRESH_AFTER).isBefore(clock.instant())
                && refreshing.compareAndSet(false, true)) {
            executor.execute(() -> {
                try {
                    refresh();
                } finally {
                    refreshing.set(false);
                }
            });
        }
        return collected;
    }

    // 수집한 적이 없거나, 수집했지만 학교 사이트를 하나도 못 읽은 지 1분이 지났다.
    private boolean needsFirstList() {
        return collectedAt == null
                || (collected.isEmpty() && collectedAt.plus(RETRY_AFTER).isBefore(clock.instant()));
    }

    synchronized void refresh() {
        try {
            var listed = collector.collectLists();
            // 모든 게시판을 못 읽은 수집으로 이전 목록을 지우지 않는다.
            if (listed.isEmpty()) {
                log.warn("No school board could be read");
                return;
            }
            var known = new HashMap<String, SchoolNotice>();
            for (var notice : school) if (hasDetail(notice)) known.put(key(notice), notice);
            publish(listed.stream().map(notice -> known.getOrDefault(key(notice), notice)).toList());
            log.info("Listed {} school notices", listed.size());
            var pending = school.stream().filter(notice -> !hasDetail(notice)).toList();
            if (!pending.isEmpty()) executor.execute(() -> collector.collectDetails(pending, this::merge));
        } catch (RuntimeException exception) {
            log.warn("School notice collection failed: {}", exception.toString());
        } finally {
            collectedAt = clock.instant();
        }
    }

    // 본문을 못 읽었거나 본문이 이미지뿐이고 첨부도 없던 공지는 다음 수집 때 상세를 다시 읽는다.
    private static boolean hasDetail(SchoolNotice notice) {
        return notice.detailRead() && (!notice.content().isBlank() || !notice.attachments().isEmpty());
    }

    private synchronized void merge(List<SchoolNotice> read) {
        var byKey = new HashMap<String, SchoolNotice>();
        for (var notice : read) byKey.put(key(notice), notice);
        publish(school.stream().map(notice -> byKey.getOrDefault(key(notice), notice)).toList());
    }

    private void publish(List<SchoolNotice> notices) {
        school = notices;
        collected = notices.stream().map(CollectedNotices::toNotice)
                .sorted(Comparator.comparing(Notice::postedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }

    private static String key(SchoolNotice notice) {
        return notice.boardKey() + "-" + notice.id();
    }

    /** 학교 게시판을 하나도 읽지 못해 보여줄 공지가 없다. */
    static class NoticeSourceUnavailableException extends RuntimeException {}
}
