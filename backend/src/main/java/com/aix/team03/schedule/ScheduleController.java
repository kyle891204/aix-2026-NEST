package com.aix.team03.schedule;

import com.aix.team03.global.error.ApiError;
import com.aix.team03.schedule.ScheduleModels.AcademicScheduleResponse;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** #10 학사일정 조회. 로그인 확인은 AuthAccessConfig의 /schedules/** 규칙이 맡는다. */
@RestController
@RequestMapping("/api/v1/schedules")
public class ScheduleController {
    private static final int MAX_RANGE_DAYS = 366;

    private final ScheduleService schedules;

    public ScheduleController(ScheduleService schedules) { this.schedules = schedules; }

    @GetMapping("/academic")
    public AcademicScheduleResponse academic(@RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        LocalDate start = date("from", from);
        LocalDate end = date("to", to);
        if (end.isBefore(start) || ChronoUnit.DAYS.between(start, end) > MAX_RANGE_DAYS) {
            throw new InvalidQueryException("to", "from 이후 날짜여야 하며 최대 366일까지 조회할 수 있습니다.");
        }
        return schedules.academic(start, end);
    }

    private static LocalDate date(String field, String value) {
        try {
            return LocalDate.parse(value == null ? "" : value);
        } catch (DateTimeParseException exception) {
            throw new InvalidQueryException(field, "YYYY-MM-DD 형식의 날짜여야 합니다.");
        }
    }

    @ExceptionHandler(InvalidQueryException.class)
    public ResponseEntity<ApiError> invalidQuery(InvalidQueryException exception) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ApiError(
                "INVALID_REQUEST", "입력 값을 확인해 주세요.", Map.of(exception.field, exception.getMessage())));
    }

    private static class InvalidQueryException extends RuntimeException {
        private final String field;

        InvalidQueryException(String field, String message) {
            super(message);
            this.field = field;
        }
    }
}
