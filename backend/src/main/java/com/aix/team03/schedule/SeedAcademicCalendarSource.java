package com.aix.team03.schedule;

import com.aix.team03.schedule.ScheduleModels.AcademicCalendar;
import com.aix.team03.schedule.ScheduleModels.AcademicEvent;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashSet;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

/** 공식 학사일정 페이지에서 옮긴 일정. 옮기다 생긴 오류를 시연 중에 발견하지 않도록 서버 시작 때 검사한다. */
@Component
public class SeedAcademicCalendarSource implements AcademicCalendarSource {
    private static final String RESOURCE = "seed/academic-calendar.json";

    private final AcademicCalendar calendar;

    public SeedAcademicCalendarSource(JsonMapper mapper) {
        try (InputStream input = new ClassPathResource(RESOURCE).getInputStream()) {
            calendar = validated(mapper.readValue(input, AcademicCalendar.class));
        } catch (IOException exception) {
            throw new IllegalStateException("학사일정을 읽을 수 없습니다: " + RESOURCE, exception);
        }
    }

    @Override
    public AcademicCalendar calendar() { return calendar; }

    static AcademicCalendar validated(AcademicCalendar calendar) {
        if (calendar == null || calendar.sourceUrl() == null || calendar.sourceUrl().isBlank()
                || calendar.events() == null) {
            throw new IllegalStateException("학사일정 항목을 확인해 주세요: " + calendar);
        }
        var ids = new HashSet<String>();
        for (AcademicEvent event : calendar.events()) {
            if (event == null || event.scheduleId() == null || event.scheduleId().isBlank() || event.title() == null
                    || event.title().isBlank() || event.startDate() == null || event.endDate() == null
                    || event.endDate().isBefore(event.startDate()) || !ids.add(event.scheduleId())) {
                throw new IllegalStateException("학사일정 항목을 확인해 주세요: " + event);
            }
        }
        return calendar;
    }
}
