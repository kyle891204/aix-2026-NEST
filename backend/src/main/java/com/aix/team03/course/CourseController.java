package com.aix.team03.course;

import com.aix.team03.global.error.ApiError;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import static com.aix.team03.course.CourseModels.*;

/** #9 과목알림. 로그인 확인은 AuthAccessConfig의 /courses/** 규칙이 맡는다. LMS 오류는 GlobalExceptionHandler의 LMS 형식으로 응답한다. */
@RestController
@RequestMapping("/api/v1/courses")
public class CourseController {
    private final CourseService courses;

    public CourseController(CourseService courses) { this.courses = courses; }

    @GetMapping
    public CourseList courses() { return courses.courses(); }

    @GetMapping("/{courseId}/notifications")
    public CourseNotifications notifications(@PathVariable long courseId,
            @RequestParam(defaultValue = "ALL") String type,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        // 공지 조회 기간 기본값은 기존 LMS 개발 API와 같이 한국 날짜 기준 최근 90일이다.
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Seoul"));
        return courses.notifications(courseId, types(type),
                startDate == null ? today.minusDays(90) : startDate, endDate == null ? today : endDate);
    }

    private static Set<NotificationType> types(String type) {
        if ("ALL".equals(type)) return EnumSet.allOf(NotificationType.class);
        try {
            return EnumSet.of(NotificationType.valueOf(type));
        } catch (IllegalArgumentException exception) {
            throw new InvalidQueryException("type", "ALL, ANNOUNCEMENT, ASSIGNMENT, MATERIAL 중 하나여야 합니다.");
        }
    }

    @ExceptionHandler(InvalidQueryException.class)
    public ResponseEntity<ApiError> invalidQuery(InvalidQueryException exception) {
        return invalid(exception.field, exception.getMessage());
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiError> typeMismatch(MethodArgumentTypeMismatchException exception) {
        String message = exception.getRequiredType() == LocalDate.class ? "YYYY-MM-DD 형식이어야 합니다." : "숫자여야 합니다.";
        return invalid(exception.getName(), message);
    }

    private static ResponseEntity<ApiError> invalid(String field, String message) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ApiError("INVALID_REQUEST", "입력 값을 확인해 주세요.", Map.of(field, message)));
    }

    private static class InvalidQueryException extends RuntimeException {
        private final String field;

        InvalidQueryException(String field, String message) {
            super(message);
            this.field = field;
        }
    }
}
