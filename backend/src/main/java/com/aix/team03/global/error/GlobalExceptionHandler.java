package com.aix.team03.global.error;

import java.util.LinkedHashMap;
import com.aix.team03.auth.AuthException;
import com.aix.team03.integrations.lms.LmsIntegrationException;
import com.aix.team03.notices.NoticeSourceUnavailableException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(AuthException.class)
    public ResponseEntity<ApiError> authError(AuthException exception) {
        return ResponseEntity.status(exception.getStatus())
                .body(new ApiError(exception.getCode(), exception.getMessage(), java.util.Map.of()));
    }

    @ExceptionHandler(LmsIntegrationException.class)
    public ResponseEntity<LmsError> lmsError(LmsIntegrationException exception) {
        return ResponseEntity.status(exception.getStatus()).body(
                new LmsError(exception.getCode(), exception.getMessage(), exception.getUpstreamStatus()));
    }

    public record LmsError(String code, String message, Integer upstreamStatus) {}

    // 전체공지와 대시보드가 같은 공지 저장소를 쓰므로 학교 공지를 못 읽었을 때의 응답도 같게 한다.
    @ExceptionHandler(NoticeSourceUnavailableException.class)
    public ResponseEntity<ApiError> noticeSourceUnavailable() {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(new ApiError("NOTICE_SOURCE_UNAVAILABLE",
                "학교 공지를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.", java.util.Map.of()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> invalidRequest(MethodArgumentNotValidException exception) {
        var fields = new LinkedHashMap<String, String>();
        for (var error : exception.getBindingResult().getFieldErrors()) {
            fields.putIfAbsent(error.getField(), error.getDefaultMessage());
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ApiError("INVALID_REQUEST", "입력 값을 확인해 주세요.", fields));
    }
}
