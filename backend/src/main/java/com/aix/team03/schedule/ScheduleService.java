package com.aix.team03.schedule;

import com.aix.team03.schedule.ScheduleModels.AcademicEvent;
import com.aix.team03.schedule.ScheduleModels.AcademicScheduleResponse;
import java.time.LocalDate;
import java.util.Comparator;
import org.springframework.stereotype.Service;

/** 기간과 겹치는 학사일정을 날짜순으로 돌려준다. 기간에 걸쳐 있으면 시작일이 기간 밖이어도 포함한다. */
@Service
public class ScheduleService {
    private static final Comparator<AcademicEvent> BY_DATE = Comparator.comparing(AcademicEvent::startDate)
            .thenComparing(AcademicEvent::endDate)
            .thenComparing(AcademicEvent::scheduleId);

    private final AcademicCalendarSource source;

    public ScheduleService(AcademicCalendarSource source) { this.source = source; }

    public AcademicScheduleResponse academic(LocalDate from, LocalDate to) {
        var calendar = source.calendar();
        var schedules = calendar.events().stream()
                .filter(event -> !event.startDate().isAfter(to) && !event.endDate().isBefore(from))
                .sorted(BY_DATE)
                .toList();
        return new AcademicScheduleResponse(calendar.sourceUrl(), calendar.checkedAt(), schedules);
    }
}
