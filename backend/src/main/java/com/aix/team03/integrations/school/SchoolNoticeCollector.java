package com.aix.team03.integrations.school;

import com.aix.team03.integrations.school.SchoolNoticeModels.Detail;
import com.aix.team03.integrations.school.SchoolNoticeModels.ListEntry;
import com.aix.team03.integrations.school.SchoolNoticeModels.SchoolNotice;
import java.io.EOFException;
import java.io.IOException;
import java.net.SocketException;
import java.net.SocketTimeoutException;
import java.net.UnknownHostException;
import java.security.GeneralSecurityException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.stream.Collectors;
import javax.net.ssl.SSLException;
import org.jsoup.HttpStatusException;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * 공개 공지 게시판의 첫 페이지와 각 글의 상세를 읽는다. 학교 사이트에 부담을 주지 않도록 게시판마다
 * 최근 글만 가져오고 요청 사이를 띄운다. 한 게시판이나 한 글이 실패해도 나머지는 계속 읽는다.
 */
@Component
public class SchoolNoticeCollector {
    private static final Logger log = LoggerFactory.getLogger(SchoolNoticeCollector.class);
    static final int NOTICES_PER_BOARD = 10;
    private static final String USER_AGENT = "Mozilla/5.0 (compatible; NEST-ERICA-student-project)";

    /** 테스트에서 네트워크 없이 HTML을 넣을 수 있게 분리한다. */
    public interface HtmlFetcher {
        Document fetch(String url) throws IOException;

        /** 상세가 링크 없이 폼 전송으로만 열리는 게시판(LIONS칼리지)용. */
        default Document post(String url, Map<String, String> form) throws IOException {
            throw new IOException("POST is not supported: " + url);
        }
    }

    private static HtmlFetcher jsoupFetcher(int timeoutMillis) {
        requireRange("NOTICE_FETCH_TIMEOUT_MS", timeoutMillis, 1_000, 120_000);
        return new HtmlFetcher() {
            @Override
            public Document fetch(String url) throws IOException {
                return Jsoup.connect(url).userAgent(USER_AGENT).timeout(timeoutMillis).get();
            }

            @Override
            public Document post(String url, Map<String, String> form) throws IOException {
                return Jsoup.connect(url).userAgent(USER_AGENT).timeout(timeoutMillis).data(form).post();
            }
        };
    }

    private final List<SchoolBoard> boards;
    private final HtmlFetcher fetcher;
    private final int parallelism;
    private final int retries;
    private final long retryDelayMillis;
    private final String testBoard;
    private final Map<String, BoardList> lists = new ConcurrentHashMap<>();

    @Autowired
    public SchoolNoticeCollector(List<SchoolBoard> boards,
            @Value("${NOTICE_FETCH_TIMEOUT_MS:60000}") int timeoutMillis,
            @Value("${NOTICE_FETCH_PARALLELISM:3}") int parallelism,
            @Value("${NOTICE_FETCH_RETRIES:1}") int retries,
            @Value("${NOTICE_FETCH_RETRY_DELAY_MS:2000}") long retryDelayMillis,
            @Value("${NOTICE_TEST_BOARD:}") String testBoard) {
        this(boards, jsoupFetcher(timeoutMillis), 300, parallelism, retries, retryDelayMillis, testBoard);
        log.info("School notice fetch settings: timeoutMs={} parallelism={} retries={} retryDelayMs={} testBoard={}",
                timeoutMillis, parallelism, retries, retryDelayMillis, this.testBoard.isEmpty() ? "all" : this.testBoard);
    }

    SchoolNoticeCollector(List<SchoolBoard> boards, HtmlFetcher fetcher, long delayMillis) {
        this(boards, fetcher, delayMillis, 3, 1, 2_000, "");
    }

    SchoolNoticeCollector(List<SchoolBoard> boards, HtmlFetcher fetcher, long delayMillis, int parallelism,
            int retries, long retryDelayMillis, String testBoard) {
        requireRange("NOTICE_FETCH_PARALLELISM", parallelism, 1, 12);
        requireRange("NOTICE_FETCH_RETRIES", retries, 0, 2);
        requireRange("NOTICE_FETCH_RETRY_DELAY_MS", retryDelayMillis, 0, 30_000);
        this.boards = List.copyOf(boards);
        this.parallelism = parallelism;
        this.retries = retries;
        this.retryDelayMillis = retryDelayMillis;
        this.testBoard = testBoard == null ? "" : testBoard.trim();
        if (!this.testBoard.isEmpty() && boards.stream().noneMatch(board -> board.key().equals(this.testBoard))) {
            throw new IllegalArgumentException("NOTICE_TEST_BOARD must match a registered school board key");
        }
        // 상세를 폼으로 여는 게시판도 요청 사이를 똑같이 띄우도록 모든 요청을 여기로 모은다.
        this.fetcher = new HtmlFetcher() {
            @Override
            public Document fetch(String url) throws IOException {
                for (int attempt = 0; ; attempt++) {
                    pause(delayMillis);
                    try {
                        return fetcher.fetch(url);
                    } catch (IOException exception) {
                        if (Thread.currentThread().isInterrupted() || attempt >= retries || !isRetryable(exception))
                            throw exception;
                        log.warn("School GET {} failed: {}; retry {}/{} in {}ms", url,
                                exception.toString(), attempt + 1, retries, retryDelayMillis);
                        pause(retryDelayMillis);
                    }
                }
            }

            @Override
            public Document post(String url, Map<String, String> form) throws IOException {
                // 폼 토큰을 쓰는 상세 POST는 자동 재전송하지 않는다.
                pause(delayMillis);
                return fetcher.post(url, form);
            }
        };
    }

    /**
     * 게시판마다 목록 첫 페이지만 읽는다. 본문은 아직 없는(content가 null인) 공지로 돌려주고,
     * 상세는 {@link #collectDetails}로 따로 읽는다. 목록 12쪽만 읽어 첫 화면을 빨리 보여주기 위해서다.
     */
    public List<SchoolNotice> collectLists() {
        var targets = boards.stream()
                .filter(board -> testBoard.isEmpty() || board.key().equals(testBoard))
                .toList();
        if (!testBoard.isEmpty()) log.warn("NOTICE_TEST_BOARD active: collecting only {}", testBoard);

        return inParallel(targets, board -> {
            long started = System.nanoTime();
            try {
                var page = fetcher.fetch(board.listUrl());
                log.info("School board {} HTML fetched in {}ms (finalUrl={})", board.key(), elapsedMillis(started),
                        page.location());
                var entries = board.parseList(page).stream().limit(NOTICES_PER_BOARD).toList();
                log.info("School board {} parsed {} entries", board.key(), entries.size());
                if (entries.isEmpty())
                    log.warn("School board {} returned HTML but no notice entries (title={})", board.key(), page.title());
                // LIONS칼리지처럼 상세를 목록 페이지의 폼으로 여는 게시판을 위해 마지막 목록 페이지를 둔다.
                lists.put(board.key(), new BoardList(board, page, entries));
                return entries.stream().map(entry -> notice(board, entry, null)).toList();
            } catch (IOException | RuntimeException exception) {
                log.warn("School board {} could not be read after {}ms", board.key(), elapsedMillis(started), exception);
                return List.of();
            }
        });
    }

    /** 공지의 상세를 게시판별로 읽고, 한 게시판을 다 읽을 때마다 그 게시판 공지를 넘긴다. */
    public void collectDetails(List<SchoolNotice> pending, Consumer<List<SchoolNotice>> onBoardRead) {
        var byBoard = pending.stream()
                .collect(Collectors.groupingBy(SchoolNotice::boardKey, LinkedHashMap::new, Collectors.toList()));
        inParallel(List.copyOf(byBoard.values()), notices -> {
            var list = lists.get(notices.getFirst().boardKey());
            if (list == null) return List.of();
            var read = notices.stream()
                    .flatMap(notice -> list.entries().stream().filter(entry -> entry.id().equals(notice.id())))
                    .map(entry -> {
                        var detail = detail(list, entry);
                        return notice(list.board(), entry, detail);
                    })
                    .toList();
            onBoardRead.accept(read);
            return read;
        });
    }

    private record BoardList(SchoolBoard board, Document page, List<ListEntry> entries) {}

    private static SchoolNotice notice(SchoolBoard board, ListEntry entry, Detail detail) {
        // 상세의 게시일이 목록보다 정확해서(연도 포함) 먼저 쓴다.
        var postedAt = detail != null && detail.postedAt() != null ? detail.postedAt() : entry.postedAt();
        return new SchoolNotice(board.key(), board.kind(), board.name(), board.collegeId(), entry.id(), entry.label(),
                entry.title(), postedAt, entry.url(), detail == null ? null : detail.content(),
                detail == null ? List.of() : detail.attachments());
    }

    // 게시판마다 사이트가 달라 동시에 읽는다. 한 게시판 안에서는 요청 사이를 띄우므로 사이트마다 부담은 그대로다.
    private <T> List<SchoolNotice> inParallel(List<T> items, Function<T, List<SchoolNotice>> work) {
        if (items.isEmpty()) return List.of();
        try (var pool = Executors.newFixedThreadPool(Math.min(parallelism, items.size()))) {
            var results = items.stream().map(item -> pool.submit(() -> work.apply(item))).toList();
            var notices = new ArrayList<SchoolNotice>();
            for (var result : results) {
                try {
                    notices.addAll(result.get());
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    break;
                } catch (ExecutionException exception) {
                    log.warn("School board collection failed", exception.getCause());
                }
            }
            return notices;
        }
    }

    // 상세를 못 읽은 글도 목록 정보와 원문 링크로 보여줄 수 있게 빈 상세로 둔다.
    private Detail detail(BoardList list, ListEntry entry) {
        try {
            return list.board().parseDetail(list.board().fetchDetail(list.page(), entry, fetcher));
        } catch (IOException | RuntimeException exception) {
            log.warn("School notice {} could not be read", entry.url(), exception);
            return new Detail("", null, List.of());
        }
    }

    private static boolean isRetryable(IOException exception) {
        if (exception instanceof HttpStatusException status)
            return status.getStatusCode() == 429 || status.getStatusCode() >= 500;
        // 인증서 검증 실패는 재시도로 해결하거나 검증을 생략하지 않는다.
        for (Throwable cause = exception; cause != null; cause = cause.getCause())
            if (cause instanceof GeneralSecurityException) return false;
        return exception instanceof SocketTimeoutException || exception instanceof SocketException
                || exception instanceof SSLException || exception instanceof EOFException
                || exception instanceof UnknownHostException;
    }

    private static long elapsedMillis(long started) {
        return TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - started);
    }

    private static void requireRange(String name, long value, long min, long max) {
        if (value < min || value > max)
            throw new IllegalArgumentException(name + " must be between " + min + " and " + max);
    }

    private static void pause(long delayMillis) throws IOException {
        if (delayMillis <= 0) return;
        try {
            Thread.sleep(delayMillis);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IOException("interrupted", exception);
        }
    }
}
