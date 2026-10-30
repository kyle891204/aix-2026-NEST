package com.aix.team03.community;

import com.aix.team03.global.error.ApiError;
import com.aix.team03.integrations.ai.TranslationService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 장터·질문 글과 답글을 조회자의 선호 언어로 번역한다. 로그인 확인은 AuthAccessConfig의 /community/** 규칙이 맡는다. */
@RestController
@RequestMapping("/api/v1/community/translations")
public class CommunityTranslationController {
    private static final Logger log = LoggerFactory.getLogger(CommunityTranslationController.class);
    // Gemini에는 언어 코드 대신 이름을 전달한다. zh는 간체로 번역한다.
    private static final Map<String, String> LANGUAGE_NAMES =
            Map.of("ko", "Korean", "en", "English", "zh", "Simplified Chinese");

    private final TranslationService translations;

    public CommunityTranslationController(TranslationService translations) { this.translations = translations; }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public TranslationResponse translate(@Valid @RequestBody TranslationRequest body) {
        // 작성 언어와 목표 언어가 같으면 Gemini를 호출하지 않고 원문을 돌려준다.
        if (body.targetLanguage().equals(body.sourceLanguage())) {
            return new TranslationResponse(body.text(), body.targetLanguage(), false);
        }
        try {
            var result = translations.translate(body.text(), body.context(), LANGUAGE_NAMES.get(body.targetLanguage()));
            return new TranslationResponse(result.translatedText(), body.targetLanguage(), result.cached());
        } catch (RuntimeException exception) {
            // 키 미설정·응답 오류·네트워크 실패 모두 화면에서는 원문과 재시도로 처리하므로 하나의 코드로 응답한다.
            log.warn("Community translation failed: {}", exception.toString());
            throw new TranslationFailedException();
        }
    }

    @ExceptionHandler(TranslationFailedException.class)
    public ResponseEntity<ApiError> translationFailed() {
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(new ApiError(
                "TRANSLATION_FAILED", "번역하지 못했습니다. 원문을 확인하거나 다시 시도해 주세요.", Map.of()));
    }

    public record TranslationRequest(
            @NotBlank @Size(max = 3000) String text,
            @NotBlank @Pattern(regexp = "ko|en|zh") String targetLanguage,
            @Pattern(regexp = "ko|en|zh") String sourceLanguage,
            @Size(max = 200) String context) {}

    public record TranslationResponse(String translatedText, String targetLanguage, boolean cached) {}

    private static class TranslationFailedException extends RuntimeException {}
}
