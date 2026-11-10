package com.aix.team03.integrations.school;

import com.aix.team03.integrations.school.SchoolNoticeCollector.HtmlFetcher;
import com.aix.team03.integrations.school.SchoolNoticeModels.BoardKind;
import com.aix.team03.integrations.school.SchoolNoticeModels.Detail;
import com.aix.team03.integrations.school.SchoolNoticeModels.ListEntry;
import java.io.IOException;
import java.net.SocketTimeoutException;
import java.security.cert.CertificateException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.IntStream;
import javax.net.ssl.SSLHandshakeException;
import org.jsoup.HttpStatusException;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SchoolNoticeCollectorTests {
    private static Document page(String url) {
        return Jsoup.parse("<title>Test board</title><p>Notice body</p>", url);
    }

    private static SchoolNoticeCollector collector(List<SchoolBoard> boards, HtmlFetcher fetcher, int parallelism,
            int retries, String testBoard) {
        return new SchoolNoticeCollector(boards, fetcher, 0, parallelism, retries, 0, testBoard);
    }

    @Test
    void diagnosticModeReadsOnlySelectedBoardAndBlankRestoresAllBoards() {
        var a = new TestBoard("a");
        var b = new TestBoard("b");
        var requests = new java.util.concurrent.CopyOnWriteArrayList<String>();
        HtmlFetcher fetcher = url -> { requests.add(url); return page(url); };

        assertThat(collector(List.of(a, b), fetcher, 3, 0, " b ").collectLists())
                .extracting(notice -> notice.boardKey()).containsExactly("b");
        assertThat(requests).containsExactly(b.listUrl());

        requests.clear();
        assertThat(collector(List.of(a, b), fetcher, 3, 0, "  ").collectLists()).hasSize(2);
        assertThat(requests).containsExactlyInAnyOrder(a.listUrl(), b.listUrl());
    }

    @Test
    void invalidDiagnosticKeyAndOutOfRangeSettingsFailBeforeNetworkRequests() {
        var boards = List.<SchoolBoard>of(new TestBoard("a"));
        assertThatThrownBy(() -> collector(boards, SchoolNoticeCollectorTests::page, 3, 1, "typo"))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("NOTICE_TEST_BOARD");
        assertThatThrownBy(() -> collector(boards, SchoolNoticeCollectorTests::page, 0, 1, ""))
                .hasMessageContaining("NOTICE_FETCH_PARALLELISM");
        assertThatThrownBy(() -> collector(boards, SchoolNoticeCollectorTests::page, 3, 3, ""))
                .hasMessageContaining("NOTICE_FETCH_RETRIES");
        assertThatThrownBy(() -> new SchoolNoticeCollector(boards, 0, 3, 1, 2_000, ""))
                .hasMessageContaining("NOTICE_FETCH_TIMEOUT_MS");
        assertThatThrownBy(() -> new SchoolNoticeCollector(boards, SchoolNoticeCollectorTests::page,
                0, 3, 1, -1, ""))
                .hasMessageContaining("NOTICE_FETCH_RETRY_DELAY_MS");
    }

    @Test
    void transientGetFailureIsRetriedAndSuccessfulResultIsParsed() {
        var calls = new AtomicInteger();
        var board = new TestBoard("a");
        var collector = collector(List.of(board), url -> {
            if (calls.incrementAndGet() == 1) throw new SocketTimeoutException("Read timed out");
            return page(url);
        }, 1, 1, "");

        assertThat(collector.collectLists()).singleElement().satisfies(notice -> {
            assertThat(notice.boardKey()).isEqualTo("a");
            assertThat(notice.content()).isNull();
        });
        assertThat(calls).hasValue(2);
    }

    @Test
    void exhaustedRetriesDoNotPreventOtherBoardsFromBeingCollected() {
        var failed = new TestBoard("failed");
        var good = new TestBoard("good");
        var failedCalls = new AtomicInteger();
        var collector = collector(List.of(failed, good), url -> {
            if (url.equals(failed.listUrl())) {
                failedCalls.incrementAndGet();
                throw new HttpStatusException("Unavailable", 503, url);
            }
            return page(url);
        }, 2, 1, "");

        assertThat(collector.collectLists()).extracting(notice -> notice.boardKey()).containsExactly("good");
        assertThat(failedCalls).hasValue(2);
    }

    @Test
    void zeroRetriesMakesExactlyOneAttempt() {
        var calls = new AtomicInteger();
        var collector = collector(List.of(new TestBoard("a")), url -> {
            calls.incrementAndGet();
            throw new SocketTimeoutException("Read timed out");
        }, 1, 0, "");

        assertThat(collector.collectLists()).isEmpty();
        assertThat(calls).hasValue(1);
    }

    @Test
    void permanentHttpAndCertificateFailuresAreNotRetried() {
        var board = new TestBoard("a");
        var badCertificate = new SSLHandshakeException("Certificate rejected");
        badCertificate.initCause(new CertificateException("Untrusted certificate"));
        for (var failure : List.of(new HttpStatusException("Forbidden", 403, board.listUrl()), badCertificate)) {
            var calls = new AtomicInteger();
            var collector = collector(List.of(board), url -> { calls.incrementAndGet(); throw failure; }, 1, 2, "");
            assertThat(collector.collectLists()).isEmpty();
            assertThat(calls).hasValue(1);
        }
    }

    @Test
    void parsingErrorsDoNotTriggerNetworkRetriesAndEmptyHtmlRemainsEmpty() {
        var calls = new AtomicInteger();
        var broken = new TestBoard("broken") {
            @Override public List<ListEntry> parseList(Document page) { throw new IllegalStateException("Bad HTML"); }
        };
        var collector = collector(List.of(broken), url -> { calls.incrementAndGet(); return page(url); }, 1, 2, "");
        assertThat(collector.collectLists()).isEmpty();
        assertThat(calls).hasValue(1);

        var empty = new TestBoard("empty") {
            @Override public List<ListEntry> parseList(Document page) { return List.of(); }
        };
        assertThat(collector(List.of(empty), SchoolNoticeCollectorTests::page, 1, 1, "").collectLists()).isEmpty();
    }

    @Test
    void detailsRetryGetButNeverReplayFormPost() {
        var get = new TestBoard("get");
        var post = new TestBoard("post") {
            @Override public Document fetchDetail(Document list, ListEntry entry, HtmlFetcher fetcher) throws IOException {
                return fetcher.post(listUrl(), Map.of("token", "test-only"));
            }
        };
        var detailGetCalls = new AtomicInteger();
        var postCalls = new AtomicInteger();
        var collector = collector(List.of(get, post), new HtmlFetcher() {
            @Override public Document fetch(String url) throws IOException {
                if (url.endsWith("/1") && detailGetCalls.incrementAndGet() == 1)
                    throw new SocketTimeoutException("Read timed out");
                return page(url);
            }
            @Override public Document post(String url, Map<String, String> form) throws IOException {
                postCalls.incrementAndGet();
                throw new SocketTimeoutException("Read timed out");
            }
        }, 2, 1, "");
        var listed = collector.collectLists();
        var details = new java.util.concurrent.CopyOnWriteArrayList<SchoolNoticeModels.SchoolNotice>();
        collector.collectDetails(listed, details::addAll);

        assertThat(detailGetCalls).hasValue(2);
        assertThat(postCalls).hasValue(1);
        assertThat(details).filteredOn(notice -> notice.boardKey().equals("get"))
                .singleElement().satisfies(notice -> assertThat(notice.content()).isEqualTo("Notice body"));
        assertThat(details).filteredOn(notice -> notice.boardKey().equals("post"))
                .singleElement().satisfies(notice -> assertThat(notice.content()).isEmpty());
    }

    @Test
    void interruptionDoesNotStartAnotherAttempt() {
        var calls = new AtomicInteger();
        var collector = collector(List.of(new TestBoard("a")), url -> {
            calls.incrementAndGet();
            Thread.currentThread().interrupt();
            throw new SocketTimeoutException("Interrupted test request");
        }, 1, 2, "");

        assertThat(collector.collectLists()).isEmpty();
        assertThat(calls).hasValue(1);
    }

    @Test
    void parallelRequestsStayWithinConfiguredLimit() throws Exception {
        var boards = IntStream.range(0, 6).mapToObj(i -> (SchoolBoard) new TestBoard("board-" + i)).toList();
        var running = new AtomicInteger();
        var peak = new AtomicInteger();
        var firstTwo = new CountDownLatch(2);
        var unexpectedThird = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        var collector = collector(boards, url -> {
            int active = running.incrementAndGet();
            peak.accumulateAndGet(active, Math::max);
            firstTwo.countDown();
            if (active > 2) unexpectedThird.countDown();
            try {
                if (!release.await(5, TimeUnit.SECONDS)) throw new IOException("Test release timed out");
                return page(url);
            } catch (InterruptedException interrupted) {
                Thread.currentThread().interrupt();
                throw new IOException(interrupted);
            } finally {
                running.decrementAndGet();
            }
        }, 2, 0, "");

        try (var executor = Executors.newSingleThreadExecutor()) {
            var result = executor.submit(collector::collectLists);
            try {
                assertThat(firstTwo.await(5, TimeUnit.SECONDS)).isTrue();
                assertThat(unexpectedThird.await(150, TimeUnit.MILLISECONDS)).isFalse();
            } finally {
                release.countDown();
            }
            assertThat(result.get(5, TimeUnit.SECONDS)).hasSize(6);
            assertThat(peak).hasValue(2);
        }
    }

    private static class TestBoard implements SchoolBoard {
        private final String key;
        TestBoard(String key) { this.key = key; }
        @Override public String key() { return key; }
        @Override public BoardKind kind() { return BoardKind.COLLEGE; }
        @Override public String name() { return key; }
        @Override public String listUrl() { return "https://" + key + ".example.test/list"; }
        @Override public List<ListEntry> parseList(Document document) {
            return List.of(new ListEntry("1", listUrl() + "/1", "", "Test notice", null));
        }
        @Override public Detail parseDetail(Document document) { return new Detail(document.select("p").text(), null, List.of()); }
    }
}
