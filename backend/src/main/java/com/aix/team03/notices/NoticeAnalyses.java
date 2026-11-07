package com.aix.team03.notices;

import com.aix.team03.matching.MatchingModels.AnalysisStatus;
import com.aix.team03.matching.MatchingModels.TargetConditions;
import com.aix.team03.matching.NoticeMatcher;
import com.aix.team03.notices.NoticeAnalysisClient.Analysis;
import com.aix.team03.notices.NoticeModels.Action;
import com.aix.team03.notices.NoticeModels.Notice;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Predicate;
import java.util.regex.Pattern;
import java.util.stream.IntStream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * 실제 공지를 상세에서 처음 열 때 Gemini로 분석하고, 결과를 서버 메모리에 둔다. DB가 없어 서버가 다시 켜지면 다시 분석한다.
 * 학생이 연 공지만 분석해 Gemini 호출을 줄이고, 목록은 이미 분석한 결과만 쓴다.
 * 분석에 실패하면 분석 전 공지를 그대로 보여주고, 잠시 뒤 다시 열면 다시 시도한다.
 */
@Service
public class NoticeAnalyses {
    private static final Logger log = LoggerFactory.getLogger(NoticeAnalyses.class);
    private static final int MAX_ENTRIES = 300;
    private static final Duration RETRY_AFTER = Duration.ofMinutes(5);
    private static final int MAX_ACTIONS = 5;
    private static final int MAX_DOCUMENTS = 8;
    private static final int MAX_TEXT = 200;
    private static final Pattern NATIONALITY = Pattern.compile("[A-Z]{2}");
    private static final Pattern VISA_TYPE = Pattern.compile("[A-Z]-\\d{1,2}(-\\d{1,2})?");
    private static final Pattern YEAR = Pattern.compile("[1-6]");

    private final NoticeAnalysisClient client;
    private final Clock clock;
    // 공지 ID와 본문이 같으면 같은 분석을 쓴다. 오래 안 쓴 결과부터 지운다.
    private final Map<String, Notice> analyzed = new LinkedHashMap<>(16, 0.75f, true);
    private final Map<String, Instant> failedAt = new LinkedHashMap<>();

    @Autowired
    public NoticeAnalyses(NoticeAnalysisClient client) { this(client, Clock.systemUTC()); }

    NoticeAnalyses(NoticeAnalysisClient client, Clock clock) {
        this.client = client;
        this.clock = clock;
    }

    /** 이미 분석한 공지면 분석 결과를 붙여 돌려준다. Gemini를 부르지 않는다. */
    public synchronized Notice cached(Notice notice) {
        return analyzed.getOrDefault(key(notice), notice);
    }

    /** 분석한 적이 없으면 Gemini로 분석한다. 분석할 수 없거나 실패하면 받은 공지를 그대로 돌려준다. */
    public Notice analyze(Notice notice) {
        if (notice.sample() || CollectedNotices.isPlaceholder(notice.originalContent())) return notice;
        var key = key(notice);
        synchronized (this) {
            var saved = analyzed.get(key);
            if (saved != null) return saved;
            var failed = failedAt.get(key);
            if (failed != null && failed.plus(RETRY_AFTER).isAfter(clock.instant())) return notice;
        }
        try {
            var result = merge(notice, client.analyze(notice.title(), notice.postedAt(), notice.originalContent()));
            synchronized (this) {
                failedAt.remove(key);
                analyzed.put(key, result);
                if (analyzed.size() > MAX_ENTRIES) analyzed.remove(analyzed.keySet().iterator().next());
            }
            return result;
        } catch (RuntimeException exception) {
            // 키 미설정·응답 오류·네트워크 실패는 로그에만 남기고 분석 전 공지를 보여준다.
            log.warn("Notice analysis failed for {}: {}", notice.noticeId(), exception.toString());
            synchronized (this) {
                failedAt.put(key, clock.instant());
                if (failedAt.size() > MAX_ENTRIES) failedAt.remove(failedAt.keySet().iterator().next());
            }
            return notice;
        }
    }

    /** Gemini 결과에서 형식에 맞는 값만 공지에 붙인다. 게시판 분류에서 읽은 학위과정은 Gemini가 비워도 남긴다. */
    static Notice merge(Notice notice, Analysis analysis) {
        var actions = texts(analysis.actions(), MAX_ACTIONS);
        var degrees = codes(analysis.degrees(), NoticeMatcher.DEGREE_LABELS::containsKey);
        if (degrees.isEmpty() && notice.targetConditions() != null && notice.targetConditions().degrees() != null) {
            degrees = notice.targetConditions().degrees();
        }
        var conditions = new TargetConditions(codes(analysis.nationalities(), NATIONALITY.asMatchPredicate()),
                codes(analysis.visaTypes(), VISA_TYPE.asMatchPredicate()), degrees,
                codes(analysis.years(), YEAR.asMatchPredicate()));
        var deadline = deadline(analysis.deadline());
        // 마감을 적었는데 날짜로 읽을 수 없으면 분석을 확실하다고 보지 않는다.
        var deadlineBroken = deadline == null && analysis.deadline() != null && !analysis.deadline().isBlank();
        var status = analysis.certain() && !deadlineBroken ? AnalysisStatus.CONFIRMED : AnalysisStatus.UNCERTAIN;
        return new Notice(notice.noticeId(), notice.source(), notice.sourceName(), notice.collegeId(),
                notice.category(), notice.title(), notice.postedAt(), status, deadline, text(analysis.target()),
                conditions, IntStream.range(0, actions.size()).mapToObj(i -> new Action("a" + (i + 1), actions.get(i)))
                        .toList(),
                texts(analysis.documents(), MAX_DOCUMENTS), notice.attachments(), notice.originalContent(),
                notice.originalLanguage(), notice.sourceUrl(), notice.sample());
    }

    private static String key(Notice notice) {
        return notice.noticeId() + ":" + notice.originalContent().hashCode();
    }

    private static String deadline(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return OffsetDateTime.parse(value.strip()).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
        } catch (DateTimeParseException exception) {
            return null;
        }
    }

    private static String text(String value) {
        if (value == null || value.isBlank()) return null;
        var stripped = value.strip();
        return stripped.length() > MAX_TEXT ? stripped.substring(0, MAX_TEXT) : stripped;
    }

    private static List<String> texts(List<String> values, int limit) {
        if (values == null) return List.of();
        return values.stream().map(NoticeAnalyses::text).filter(value -> value != null).distinct().limit(limit)
                .toList();
    }

    private static List<String> codes(List<String> values, Predicate<String> valid) {
        if (values == null) return List.of();
        return values.stream().filter(value -> value != null).map(value -> value.strip().toUpperCase(Locale.ROOT))
                .filter(valid).distinct().toList();
    }
}
