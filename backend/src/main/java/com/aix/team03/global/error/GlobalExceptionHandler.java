package com.aix.team03.global.error;

import java.util.LinkedHashMap;
import com.aix.team03.integrations.lms.LmsIntegrationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(LmsIntegrationException.class)
    public ResponseEntity<LmsError> lmsError(LmsIntegrationException exception) {
        return ResponseEntity.status(exception.getStatus()).body(
                new LmsError(exception.getCode(), exception.getMessage(), exception.getUpstreamStatus()));
    }

    public record LmsError(String code, String message, Integer upstreamStatus) {}

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
