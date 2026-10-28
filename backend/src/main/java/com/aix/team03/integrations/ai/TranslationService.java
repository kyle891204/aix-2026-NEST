package com.aix.team03.integrations.ai;

import java.time.Instant;
import java.util.LinkedHashMap;
import org.springframework.stereotype.Service;

@Service
public class TranslationService {

    private static final int MAX_ENTRIES = 200;
    private static final long TTL_SECONDS = 3600;

    private final GeminiClient gemini;
    private final LinkedHashMap<Key, Entry> cache = new LinkedHashMap<>();

    public TranslationService(GeminiClient gemini) {
        this.gemini = gemini;
    }

    public synchronized Result translate(
            String text, String context, String targetLanguage) {

        var now = Instant.now();
        cache.entrySet().removeIf(
                entry -> !entry.getValue().expiresAt().isAfter(now));

        var key = new Key(
                text,
                context == null ? "" : context,
                targetLanguage
        );

        var saved = cache.get(key);
        if (saved != null) {
            return new Result(saved.translatedText(), true);
        }

        // 정상 번역에 성공한 결과만 저장합니다.
        var translation = gemini.translate(
                key.text(), key.context(), key.targetLanguage());

        if (cache.size() >= MAX_ENTRIES) {
            cache.remove(cache.keySet().iterator().next());
        }

        cache.put(key, new Entry(
                translation.translatedText(),
                Instant.now().plusSeconds(TTL_SECONDS)
        ));

        return new Result(translation.translatedText(), false);
    }

    private record Key(
            String text, String context, String targetLanguage) {}

    private record Entry(
            String translatedText, Instant expiresAt) {}

    public record Result(
            String translatedText, boolean cached) {}
}