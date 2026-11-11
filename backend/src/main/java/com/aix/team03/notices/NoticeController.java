package com.aix.team03.notices;

import com.aix.team03.global.error.ApiError;
import com.aix.team03.matching.MatchingModels.AnalysisStatus;
import com.aix.team03.matching.MatchingModels.MatchStatus;
import com.aix.team03.matching.MatchingModels.StudentProfile;
import com.aix.team03.matching.MatchingModels.TargetConditions;
import com.aix.team03.notices.NoticeModels.Action;
import com.aix.team03.notices.NoticeModels.Attachment;
import com.aix.team03.notices.NoticeModels.Category;
import com.aix.team03.notices.NoticeModels.Source;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/**
 * S06 전체공지와 S07 공지 상세의 API. 로그인 확인은 AuthAccessConfig의 /notices/** 규칙이 맡는다.
 * 프로필은 브라우저에만 있어 조회도 POST 본문으로 받고, URL에 남기거나 저장하지 않는다.
 */
@RestController
@RequestMapping("/api/v1/notices")
public class NoticeController {
    private final NoticeService notices;

    public NoticeController(NoticeService notices) { this.notices = notices; }

    @PostMapping("/search")
    public NoticeListResponse search(@RequestParam(required = false) Source source,
            @RequestParam(required = false) MatchFilter match,
            @RequestBody(required = false) ProfileRequest body) {
        return new NoticeListResponse(notices.search(source, match, profile(body), collegeId(body)), false);
    }

    @PostMapping("/{noticeId}/view")
    public NoticeDetail view(@PathVariable String noticeId, @RequestBody(required = false) ProfileRequest body) {
        return notices.view(noticeId, profile(body), collegeId(body));
    }

    @PostMapping(value = "/{noticeId}/translations", consumes = MediaType.APPLICATION_JSON_VALUE)
    public TranslationResponse translate(@PathVariable String noticeId, @Valid @RequestBody TranslationRequest body) {
        return notices.translate(noticeId, body.targetLanguage(), collegeId(body.collegeId()));
    }

    private static String collegeId(ProfileRequest body) {
        return body == null ? null : collegeId(body.collegeId());
    }

    private static String collegeId(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private static StudentProfile profile(ProfileRequest body) {
        return body == null ? null : new StudentProfile(body.nationality(), body.visaType(), body.degree(), body.year());
    }

    @ExceptionHandler(NoticeService.NoticeNotFoundException.class)
    public ResponseEntity<ApiError> notFound() {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ApiError("NOTICE_NOT_FOUND", "공지를 찾을 수 없습니다.", Map.of()));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiError> invalidQuery(MethodArgumentTypeMismatchException exception) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ApiError("INVALID_REQUEST",
                "입력 값을 확인해 주세요.", Map.of(exception.getName(), "허용되지 않는 값입니다.")));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> unreadableBody() {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ApiError("INVALID_REQUEST", "입력 값을 확인해 주세요.", Map.of()));
    }

    /** 전체 대상 필터는 match를 보내지 않는 것이라 NOT_APPLICABLE은 받지 않는다. */
    public enum MatchFilter { APPLICABLE, NEEDS_REVIEW }

    // 길이 제한으로 400을 내지 않는다. 저장된 프로필 값이 길어도 공지가 막히지 않고, 읽을 수 없는 값은 값 없음으로 판별한다.
    // collegeId는 프로필의 단과대 ID다. 없으면 ERICA 전체 공지만 보여준다.
    public record ProfileRequest(String nationality, String visaType, String degree, String year,
            String collegeId) {}

    // collegeId는 상세 조회와 같이 다른 단과대 공지를 번역하지 않도록 받는다.
    public record TranslationRequest(@NotBlank @Pattern(regexp = "ko|en|zh") String targetLanguage,
            String collegeId) {}

    public record NoticeListResponse(List<NoticeSummary> items, boolean truncated) {}

    public record NoticeSummary(String noticeId, Source source, String sourceName, Category category, String title,
            String postedAt, AnalysisStatus analysisStatus, MatchStatus matchStatus, List<String> matchReasons,
            String deadline, boolean sample) {}

    public record NoticeDetail(String noticeId, Source source, String sourceName, Category category, String title,
            String postedAt, AnalysisStatus analysisStatus, MatchStatus matchStatus, List<String> matchReasons,
            String deadline, String target, TargetConditions targetConditions, List<Action> actions,
            List<String> documents, List<Attachment> attachments, String originalContent, String originalLanguage,
            String sourceUrl, String savedScheduleId, boolean sample) {}

    public record TranslationResponse(String noticeId, String targetLanguage, String translationStatus,
            TranslatedNotice translated, boolean retryable, String message) {}

    public record TranslatedNotice(String title, String target, List<Action> actions,
            List<String> documents, String content) {}
}
