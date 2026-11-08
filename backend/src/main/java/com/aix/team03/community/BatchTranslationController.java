package com.aix.team03.community;

import com.aix.team03.global.error.ApiError;
import com.aix.team03.integrations.ai.BatchTranslationService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/** 기존 단건 API는 유지한다. 인증·CSRF는 기존 /community/** 규칙을 그대로 따른다. */
@RestController
public class BatchTranslationController {
    private final BatchTranslationService translations;

    public BatchTranslationController(BatchTranslationService translations) {
        this.translations = translations;
    }

    @PostMapping(value = "/api/v1/community/translations/batch", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> translate(@Valid @RequestBody Request body) {
        var ids = new HashSet<String>();
        long characters = 0;
        for (var item : body.items()) {
            if (!ids.add(item.id())) return invalid("항목 ID는 중복될 수 없습니다.");
            characters += item.text().length() + (item.context() == null ? 0 : item.context().length());
        }
        if (characters > 60_000) return invalid("한 요청의 원문과 맥락은 합계 60,000자 이하여야 합니다.");
        var items = body.items().stream().map(item -> new BatchTranslationService.Item(
                item.id(), item.text(), item.sourceLanguage(), item.context())).toList();
        return ResponseEntity.ok(new Response(body.targetLanguage(), translations.translate(items, body.targetLanguage())));
    }

    private ResponseEntity<ApiError> invalid(String message) {
        return ResponseEntity.badRequest().body(new ApiError("INVALID_REQUEST", message, Map.of()));
    }

    public record Request(
            @NotBlank @Pattern(regexp = "ko|en|zh") String targetLanguage,
            @NotEmpty @Size(max = 100) List<@NotNull @Valid Item> items) {}

    public record Item(
            @NotBlank @Size(max = 200) String id,
            @NotBlank @Size(max = 3000) String text,
            @NotBlank @Pattern(regexp = "ko|en|zh") String sourceLanguage,
            @Size(max = 200) String context) {}

    public record Response(String targetLanguage, List<BatchTranslationService.Result> items) {}
}
