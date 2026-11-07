package com.aix.team03.integrations.ai;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/** DB 없이 성공 결과만 캐시한다. 기존 단건 번역 서비스와 독립적으로 추가한 묶음 경로. */
@Service
public class BatchTranslationService {
    private static final Logger log = LoggerFactory.getLogger(BatchTranslationService.class);
    private static final int MAX_ENTRIES = 200;
    private static final int MAX_BATCH_ITEMS = 20;
    private static final int MAX_BATCH_CHARACTERS = 12_000;
    private static final Map<String, String> LANGUAGES =
            Map.of("ko", "Korean", "en", "English", "zh", "Simplified Chinese");
    private final GeminiClient gemini;
    private final Clock clock;
    private final LinkedHashMap<Key, Entry> cache = new LinkedHashMap<>();
    private final Map<Key, CompletableFuture<String>> pending = new HashMap<>();

    @Autowired
    public BatchTranslationService(GeminiClient gemini) {
        this(gemini, Clock.systemUTC());
    }

    BatchTranslationService(GeminiClient gemini, Clock clock) {
        this.gemini = gemini;
        this.clock = clock;
    }

    public List<Result> translate(List<Item> items, String targetLanguage) {
        if (!LANGUAGES.containsKey(targetLanguage)) throw new IllegalArgumentException("지원하지 않는 언어입니다.");
        var ready = new HashMap<String, Result>();
        var waiting = new LinkedHashMap<String, CompletableFuture<String>>();
        var owned = new LinkedHashMap<Key, CompletableFuture<String>>();
        // 캐시·진행 중 요청 등록만 잠근다. 외부 API를 호출하며 전역 잠금을 잡지 않는다.
        synchronized (cache) {
            cache.entrySet().removeIf(entry -> !entry.getValue().expiresAt().isAfter(clock.instant()));
            for (var item : items) {
                if (targetLanguage.equals(item.sourceLanguage())) {
                    ready.put(item.id(), new Result(item.id(), "SKIPPED", item.text(), false, false));
                    continue;
                }
                var key = new Key(item.text(), item.sourceLanguage(), targetLanguage,
                        item.context() == null ? "" : item.context(), "community-batch-v1");
                var saved = cache.get(key);
                if (saved != null) {
                    ready.put(item.id(), new Result(item.id(), "SUCCEEDED", saved.text(), true, false));
                    continue;
                }
                var future = pending.get(key);
                if (future == null) {
                    future = new CompletableFuture<>();
                    pending.put(key, future);
                    owned.put(key, future);
                }
                waiting.put(item.id(), future);
            }
        }

        var chunk = new ArrayList<Key>();
        int characters = 0;
        for (var key : owned.keySet()) {
            int size = key.text().length() + key.context().length();
            if (!chunk.isEmpty() && (chunk.size() >= MAX_BATCH_ITEMS || characters + size > MAX_BATCH_CHARACTERS)) {
                translateChunk(chunk, owned, targetLanguage);
                chunk.clear();
                characters = 0;
            }
            chunk.add(key);
            characters += size;
        }
        if (!chunk.isEmpty()) translateChunk(chunk, owned, targetLanguage);

        return items.stream().map(item -> {
            if (ready.containsKey(item.id())) return ready.get(item.id());
            try {
                // 다른 요청과 공유하는 번역도 무기한 기다리지 않는다.
                var text = waiting.get(item.id()).get(55, TimeUnit.SECONDS);
                return new Result(item.id(), "SUCCEEDED", text, false, false);
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                return failed(item.id());
            } catch (Exception exception) {
                return failed(item.id());
            }
        }).toList();
    }

    private void translateChunk(List<Key> keys, Map<Key, CompletableFuture<String>> owned, String language) {
        var input = new ArrayList<GeminiClient.BatchInput>();
        for (int i = 0; i < keys.size(); i++) {
            var key = keys.get(i);
            // 응답의 ID는 외부 글 ID 대신 이 호출 안의 임시 ID를 사용한다.
            input.add(new GeminiClient.BatchInput("item-" + i, key.text(),
                    LANGUAGES.get(key.sourceLanguage()), key.context()));
        }
        try {
            var response = gemini.translateBatch(input, LANGUAGES.get(language));
            if (response == null || response.items() == null) throw new IllegalStateException("잘못된 묶음 번역 응답");
            var expected = new HashSet<String>();
            input.forEach(item -> expected.add(item.id()));
            var seen = new HashSet<String>();
            var duplicate = new HashSet<String>();
            var output = new HashMap<String, String>();
            for (var item : response.items()) {
                if (item == null || !expected.contains(item.id())) throw new IllegalStateException("알 수 없는 번역 ID");
                if (!seen.add(item.id())) duplicate.add(item.id());
                if (item.translatedText() != null && !item.translatedText().isBlank()
                        && item.translatedText().length() <= 24_000) output.put(item.id(), item.translatedText());
            }
            for (int i = 0; i < keys.size(); i++) {
                var id = "item-" + i;
                complete(keys.get(i), owned.get(keys.get(i)), duplicate.contains(id) ? null : output.get(id));
            }
        } catch (RuntimeException exception) {
            // 원문·키·공급자의 오류 본문은 기록하지 않는다.
            log.warn("Community batch translation failed: {}", exception.getClass().getSimpleName());
            for (var key : keys) complete(key, owned.get(key), null);
        }
    }

    private void complete(Key key, CompletableFuture<String> future, String text) {
        synchronized (cache) {
            if (text != null) {
                cache.entrySet().removeIf(entry -> !entry.getValue().expiresAt().isAfter(clock.instant()));
                if (cache.size() >= MAX_ENTRIES) cache.remove(cache.keySet().iterator().next());
                cache.put(key, new Entry(text, clock.instant().plusSeconds(3600)));
                future.complete(text);
            } else {
                future.completeExceptionally(new IllegalStateException("번역 실패"));
            }
            pending.remove(key, future);
        }
    }

    private static Result failed(String id) { return new Result(id, "FAILED", null, false, true); }
    private record Key(String text, String sourceLanguage, String targetLanguage, String context, String version) {}
    private record Entry(String text, Instant expiresAt) {}
    public record Item(String id, String text, String sourceLanguage, String context) {}
    public record Result(String id, String status, String translatedText, boolean cached, boolean retryable) {}
}
