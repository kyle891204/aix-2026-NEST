package com.aix.team03.integrations.ai;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.IntStream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class BatchTranslationServiceTests {
    GeminiClient gemini;
    BatchTranslationService service;
    AtomicReference<Instant> now;

    @BeforeEach
    void setup() {
        gemini = mock(GeminiClient.class);
        var clock = mock(Clock.class);
        now = new AtomicReference<>(Instant.parse("2026-11-07T00:00:00Z"));
        when(clock.instant()).thenAnswer(call -> now.get());
        service = new BatchTranslationService(gemini, clock);
        when(gemini.translateBatch(anyList(), anyString())).thenAnswer(call -> {
            List<GeminiClient.BatchInput> items = call.getArgument(0);
            return new GeminiClient.BatchTranslation(items.reversed().stream()
                    .map(item -> new GeminiClient.BatchOutput(item.id(), "translated:" + item.text())).toList());
        });
    }

    BatchTranslationService.Item item(String id, String text) {
        return new BatchTranslationService.Item(id, text, "ko", "게시글");
    }

    @Test
    void skipsSameLanguageAndCombinesCacheMissesIntoOneProviderCall() {
        var input = List.of(item("title", "제목"), item("reply", "댓글"), item("alias", "제목"),
                new BatchTranslationService.Item("english", "Hello", "en", "게시글"));
        var results = service.translate(input, "en");
        assertEquals(List.of("translated:제목", "translated:댓글", "translated:제목", "Hello"),
                results.stream().map(BatchTranslationService.Result::translatedText).toList());
        assertEquals("SKIPPED", results.get(3).status());
        verify(gemini).translateBatch(argThat(items -> items.size() == 2), eq("English"));
        clearInvocations(gemini);
        assertTrue(service.translate(input, "en").getFirst().cached());
        verifyNoInteractions(gemini);
    }

    @Test
    void cacheSeparatesEditsLanguagesContextsAndExpiresAfterAnHour() {
        var a = item("a", "원문");
        service.translate(List.of(a), "en");
        service.translate(List.of(item("other-id", "원문")), "en");
        verify(gemini, times(1)).translateBatch(anyList(), anyString());
        service.translate(List.of(item("a", "수정한 원문")), "en");
        service.translate(List.of(a), "zh");
        service.translate(List.of(new BatchTranslationService.Item("a", "원문", "ko", "다른 맥락")), "en");
        now.updateAndGet(time -> time.plusSeconds(3600));
        assertFalse(service.translate(List.of(a), "en").getFirst().cached());
        verify(gemini, times(5)).translateBatch(anyList(), anyString());
    }

    @Test
    void splitsByBothItemCountAndCharacterCount() {
        service.translate(IntStream.range(0, 21).mapToObj(i -> item("id-" + i, "원문" + i)).toList(), "en");
        verify(gemini, times(2)).translateBatch(argThat(items -> items.size() <= 20), eq("English"));
        clearInvocations(gemini);
        service.translate(IntStream.range(0, 5).mapToObj(i -> item("long-" + i, "가".repeat(2999) + i)).toList(), "en");
        verify(gemini, times(2)).translateBatch(argThat(items -> items.stream()
                .mapToInt(item -> item.text().length() + item.context().length()).sum() <= 12_000), anyString());
    }

    @Test
    void cachesOnlyValidItemsAndRetriesOnlyFailures() {
        when(gemini.translateBatch(anyList(), anyString())).thenReturn(new GeminiClient.BatchTranslation(List.of(
                new GeminiClient.BatchOutput("item-0", "Title"),
                new GeminiClient.BatchOutput("item-1", " "))));
        var items = List.of(item("a", "제목"), item("b", "댓글"), item("c", "누락"));
        var results = service.translate(items, "en");
        assertEquals(List.of("SUCCEEDED", "FAILED", "FAILED"), results.stream().map(BatchTranslationService.Result::status).toList());
        when(gemini.translateBatch(anyList(), anyString())).thenAnswer(call -> {
            List<GeminiClient.BatchInput> input = call.getArgument(0);
            return new GeminiClient.BatchTranslation(input.stream().map(item -> new GeminiClient.BatchOutput(item.id(), "OK")).toList());
        });
        clearInvocations(gemini);
        assertTrue(service.translate(items, "en").getFirst().cached());
        verify(gemini).translateBatch(argThat(input -> input.size() == 2), anyString());
    }

    @Test
    void duplicateIdsFailAndUnknownIdsRejectTheChunkWithoutCaching() {
        when(gemini.translateBatch(anyList(), anyString())).thenReturn(new GeminiClient.BatchTranslation(List.of(
                new GeminiClient.BatchOutput("item-0", "A"), new GeminiClient.BatchOutput("item-0", "B"))));
        assertEquals("FAILED", service.translate(List.of(item("a", "원문")), "en").getFirst().status());
        when(gemini.translateBatch(anyList(), anyString())).thenReturn(new GeminiClient.BatchTranslation(List.of(
                new GeminiClient.BatchOutput("foreign-id", "wrong"))));
        assertEquals("FAILED", service.translate(List.of(item("a", "원문")), "en").getFirst().status());
        verify(gemini, times(2)).translateBatch(anyList(), anyString());
    }

    @Test
    void networkFailureDoesNotCacheOriginalAsATranslation() {
        when(gemini.translateBatch(anyList(), anyString())).thenThrow(new IllegalStateException("provider failure"));
        for (int i = 0; i < 2; i++) {
            var result = service.translate(List.of(item("a", "원문")), "en").getFirst();
            assertEquals("FAILED", result.status());
            assertNull(result.translatedText());
            assertTrue(result.retryable());
        }
        verify(gemini, times(2)).translateBatch(anyList(), anyString());
    }

    @Test
    void sharesOverlappingConcurrentRequestsWithoutBlockingUnrelatedTranslations() throws Exception {
        var firstEntered = new CountDownLatch(1);
        var secondEntered = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        when(gemini.translateBatch(anyList(), anyString())).thenAnswer(call -> {
            List<GeminiClient.BatchInput> input = call.getArgument(0);
            if (input.getFirst().text().equals("첫째")) {
                firstEntered.countDown();
                assertTrue(release.await(5, TimeUnit.SECONDS));
            } else secondEntered.countDown();
            return new GeminiClient.BatchTranslation(input.stream().map(item -> new GeminiClient.BatchOutput(item.id(), "OK")).toList());
        });
        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = executor.submit(() -> service.translate(List.of(item("a", "첫째")), "en"));
            assertTrue(firstEntered.await(5, TimeUnit.SECONDS));
            var second = executor.submit(() -> service.translate(List.of(item("alias", "첫째"), item("b", "둘째")), "en"));
            try { assertTrue(secondEntered.await(5, TimeUnit.SECONDS)); }
            finally { release.countDown(); }
            assertEquals("SUCCEEDED", first.get(5, TimeUnit.SECONDS).getFirst().status());
            assertTrue(second.get(5, TimeUnit.SECONDS).stream().allMatch(item -> item.status().equals("SUCCEEDED")));
        }
        verify(gemini, times(2)).translateBatch(argThat(items -> items.size() == 1), anyString());
    }

    @Test
    void boundsCacheToTwoHundredEntries() {
        service.translate(IntStream.range(0, 201).mapToObj(i -> item("id-" + i, "글" + i)).toList(), "en");
        clearInvocations(gemini);
        assertTrue(service.translate(List.of(item("last", "글200")), "en").getFirst().cached());
        assertFalse(service.translate(List.of(item("first", "글0")), "en").getFirst().cached());
        verify(gemini, times(1)).translateBatch(anyList(), anyString());
    }
}
