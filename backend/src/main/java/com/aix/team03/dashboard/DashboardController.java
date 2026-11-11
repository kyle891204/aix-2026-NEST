package com.aix.team03.dashboard;

import com.aix.team03.global.error.ApiError;
import com.aix.team03.matching.MatchingModels.StudentProfile;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import static com.aix.team03.dashboard.DashboardModels.*;

/**
 * #6 맞춤형 학교 대시보드. 프로필이 브라우저에만 있어 조회지만 POST 본문으로 받는다.
 * 로그인 확인은 AuthAccessConfig의 /dashboard/** 규칙, CSRF는 공통 CSRF 검사가 맡는다.
 */
@RestController
@RequestMapping("/api/v1/dashboard")
public class DashboardController {
    private final DashboardService dashboard;

    public DashboardController(DashboardService dashboard) { this.dashboard = dashboard; }

    @PostMapping
    public DashboardResponse dashboard(@RequestBody(required = false) DashboardRequest body,
            @RequestParam(defaultValue = "20") int limit) {
        if (limit < 1 || limit > 50) throw new InvalidLimitException();
        // 본문이 없거나 맞춤정보 동의를 해제한 경우 빈 프로필로 판별한다.
        StudentProfile profile = body == null ? new StudentProfile(null, null, null, null) : body.toProfile();
        String collegeId = body == null || body.collegeId() == null || body.collegeId().isBlank() ? null
                : body.collegeId();
        return dashboard.dashboard(profile, collegeId, limit);
    }

    @ExceptionHandler({InvalidLimitException.class, MethodArgumentTypeMismatchException.class})
    public ResponseEntity<ApiError> invalidLimit() {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ApiError(
                "INVALID_REQUEST", "입력 값을 확인해 주세요.", Map.of("limit", "1~50 사이 숫자여야 합니다.")));
    }

    // 읽을 수 없는 JSON 본문도 Spring 기본 400 대신 공통 오류 형식으로 응답한다.
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> unreadableBody() {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ApiError(
                "INVALID_REQUEST", "입력 값을 확인해 주세요.", Map.of("body", "JSON 형식이 올바르지 않습니다.")));
    }

    private static class InvalidLimitException extends RuntimeException {}
}
