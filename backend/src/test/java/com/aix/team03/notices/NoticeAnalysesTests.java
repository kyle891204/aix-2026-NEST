package com.aix.team03.notices;

import com.aix.team03.matching.MatchingModels.AnalysisStatus;
import com.aix.team03.matching.MatchingModels.TargetConditions;
import com.aix.team03.notices.NoticeAnalysisClient.Analysis;
import com.aix.team03.notices.NoticeModels.Notice;
import com.aix.team03.notices.NoticeModels.Source;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** 자동 테스트용: Gemini 분석 결과를 어떻게 검사해 공지에 붙이고, 언제 다시 분석하는지 검사한다. Gemini는 부르지 않는다. */
class NoticeAnalysesTests {
    private final NoticeAnalysisClient client = mock(NoticeAnalysisClient.class);
    private final MutableClock clock = new MutableClock();
    private final NoticeAnalyses analyses = new NoticeAnalyses(client, clock);

    private static Notice notice(String content, TargetConditions conditions, boolean sample) {
        return new Notice("erica-global-1", Source.INTERNATIONAL, "ERICA 국제처", null, null, "체류기간 연장 안내",
                "2026-11-01", conditions == null ? AnalysisStatus.NOT_ANALYZED : AnalysisStatus.CONFIRMED, null,
                null, conditions, List.of(), List.of(), List.of(), content, "ko",
                "https://global.hanyang.ac.kr/bbs/board.php?wr_id=1", sample);
    }

    private static Analysis analysis(String deadline, List<String> degrees, boolean certain) {
        return new Analysis("D-2 비자 유학생", deadline, List.of("서류 제출", " ", "서류 제출", "출입국 방문 예약"),
                List.of("여권 사본", "재학증명서"), List.of("vn", "Vietnam"), List.of("D-2", "학생비자"), degrees,
                List.of("1", "7"), certain);
    }

    @Test
    void keepsOnlyValuesInTheExpectedFormat() {
        var merged = NoticeAnalyses.merge(notice("본문", null, false),
                analysis("2026-11-20T17:00+09:00", List.of("BACHELOR"), true));

        assertThat(merged.analysisStatus()).isEqualTo(AnalysisStatus.CONFIRMED);
        assertThat(merged.deadline()).isEqualTo("2026-11-20T17:00:00+09:00");
        assertThat(merged.target()).isEqualTo("D-2 비자 유학생");
        assertThat(merged.actions()).extracting(NoticeModels.Action::id).containsExactly("a1", "a2");
        assertThat(merged.actions()).extracting(NoticeModels.Action::text).containsExactly("서류 제출", "출입국 방문 예약");
        assertThat(merged.documents()).containsExactly("여권 사본", "재학증명서");
        assertThat(merged.targetConditions().nationalities()).containsExactly("VN");
        assertThat(merged.targetConditions().visaTypes()).containsExactly("D-2");
        assertThat(merged.targetConditions().degrees()).containsExactly("BACHELOR");
        assertThat(merged.targetConditions().years()).containsExactly("1");
        assertThat(merged.originalContent()).isEqualTo("본문");
    }

    @Test
    void unreadableDeadlineOrUnsureAnswerIsUncertain() {
        assertThat(NoticeAnalyses.merge(notice("본문", null, false), analysis("11월 말", List.of(), true)))
                .satisfies(merged -> {
                    assertThat(merged.deadline()).isNull();
                    assertThat(merged.analysisStatus()).isEqualTo(AnalysisStatus.UNCERTAIN);
                });
        assertThat(NoticeAnalyses.merge(notice("본문", null, false), analysis("", List.of(), false)).analysisStatus())
                .isEqualTo(AnalysisStatus.UNCERTAIN);
    }

    @Test
    void deadlineWithoutOffsetIsReadAsKoreanTime() {
        var withTime = NoticeAnalyses.merge(notice("본문", null, false),
                analysis("2026-11-20T17:00:00", List.of(), true));
        var dateOnly = NoticeAnalyses.merge(notice("본문", null, false), analysis("2026-11-20", List.of(), true));

        assertThat(withTime.deadline()).isEqualTo("2026-11-20T17:00:00+09:00");
        assertThat(withTime.analysisStatus()).isEqualTo(AnalysisStatus.CONFIRMED);
        assertThat(dateOnly.deadline()).isEqualTo("2026-11-20T23:59:00+09:00");
        assertThat(dateOnly.analysisStatus()).isEqualTo(AnalysisStatus.CONFIRMED);
    }

    @Test
    void sameNoticeOpenedTogetherIsAnalyzedOnce() throws Exception {
        var called = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        when(client.analyze(any(), any(), any())).thenAnswer(call -> {
            called.countDown();
            release.await(5, TimeUnit.SECONDS);
            return analysis("", List.of(), true);
        });
        var original = notice("본문", null, false);
        var pool = Executors.newFixedThreadPool(2);
        try {
            var first = pool.submit(() -> analyses.analyze(original));
            assertThat(called.await(5, TimeUnit.SECONDS)).isTrue();
            var waiter = new Thread[1];
            var second = pool.submit(() -> {
                waiter[0] = Thread.currentThread();
                return analyses.analyze(original);
            });
            awaitWaiting(waiter);
            release.countDown();

            assertThat(second.get(5, TimeUnit.SECONDS)).isSameAs(first.get(5, TimeUnit.SECONDS));
            assertThat(first.get().analysisStatus()).isEqualTo(AnalysisStatus.CONFIRMED);
            verify(client, times(1)).analyze(any(), any(), any());
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    void waitingRequestGetsOriginalWhenAnalysisFails() throws Exception {
        var called = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        when(client.analyze(any(), any(), any())).thenAnswer(call -> {
            called.countDown();
            release.await(5, TimeUnit.SECONDS);
            throw new IllegalStateException("quota");
        });
        var original = notice("본문", null, false);
        var pool = Executors.newFixedThreadPool(2);
        try {
            var first = pool.submit(() -> analyses.analyze(original));
            assertThat(called.await(5, TimeUnit.SECONDS)).isTrue();
            var waiter = new Thread[1];
            var second = pool.submit(() -> {
                waiter[0] = Thread.currentThread();
                return analyses.analyze(original);
            });
            awaitWaiting(waiter);
            release.countDown();

            assertThat(first.get(5, TimeUnit.SECONDS)).isSameAs(original);
            assertThat(second.get(5, TimeUnit.SECONDS)).isSameAs(original);
            verify(client, times(1)).analyze(any(), any(), any());
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    void boardLabelDegreesStayWhenGeminiFindsNone() {
        var graduate = new TargetConditions(null, null, List.of("MASTER", "DOCTORAL"), null);

        var merged = NoticeAnalyses.merge(notice("본문", graduate, false), analysis("", List.of(), true));

        assertThat(merged.targetConditions().degrees()).containsExactly("MASTER", "DOCTORAL");
    }

    @Test
    void analyzesOnceAndSharesResultWithList() {
        when(client.analyze(any(), any(), any())).thenReturn(analysis("", List.of(), true));
        var original = notice("본문", null, false);

        assertThat(analyses.cached(original)).isSameAs(original);
        var first = analyses.analyze(original);
        var second = analyses.analyze(original);

        assertThat(first.analysisStatus()).isEqualTo(AnalysisStatus.CONFIRMED);
        assertThat(second).isSameAs(first);
        assertThat(analyses.cached(original)).isSameAs(first);
        verify(client, times(1)).analyze("체류기간 연장 안내", "2026-11-01", "본문");
    }

    @Test
    void changedContentIsAnalyzedAgain() {
        when(client.analyze(any(), any(), any())).thenReturn(analysis("", List.of(), true));

        analyses.analyze(notice("본문", null, false));
        analyses.analyze(notice("고친 본문", null, false));

        verify(client, times(2)).analyze(any(), any(), any());
    }

    @Test
    void failureShowsOriginalAndRetriesAfterFiveMinutes() {
        when(client.analyze(any(), any(), any())).thenThrow(new IllegalStateException("quota"))
                .thenReturn(analysis("", List.of(), true));
        var original = notice("본문", null, false);

        assertThat(analyses.analyze(original)).isSameAs(original);
        clock.now = clock.now.plusSeconds(60);
        assertThat(analyses.analyze(original)).isSameAs(original);
        verify(client, times(1)).analyze(any(), any(), any());

        clock.now = clock.now.plusSeconds(5 * 60);
        assertThat(analyses.analyze(original).analysisStatus()).isEqualTo(AnalysisStatus.CONFIRMED);
    }

    @Test
    void samplesAndPlaceholderBodiesAreNotSentToGemini() {
        analyses.analyze(notice("본문", null, true));
        analyses.analyze(notice(CollectedNotices.LOADING_CONTENT, null, false));
        analyses.analyze(notice(CollectedNotices.FAILED_CONTENT, null, false));
        analyses.analyze(notice(CollectedNotices.MISSING_CONTENT, null, false));

        verifyNoInteractions(client);
    }

    // 두 번째 요청이 첫 분석을 기다리기 시작할 때까지 기다린다. 그 뒤에 Gemini 응답을 돌려줘야 동시 요청을 검사할 수 있다.
    private static void awaitWaiting(Thread[] waiter) {
        var deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
        while ((waiter[0] == null || waiter[0].getState() != Thread.State.WAITING) && System.nanoTime() < deadline) {
            Thread.onSpinWait();
        }
        assertThat(waiter[0].getState()).isEqualTo(Thread.State.WAITING);
    }

    private static class MutableClock extends Clock {
        Instant now = Instant.parse("2026-11-07T00:00:00Z");

        @Override public ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(ZoneId zone) { return this; }
        @Override public Instant instant() { return now; }
    }
}
