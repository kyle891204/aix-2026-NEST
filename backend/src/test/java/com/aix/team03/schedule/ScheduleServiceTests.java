package com.aix.team03.schedule;

import com.aix.team03.schedule.ScheduleModels.AcademicCalendar;
import com.aix.team03.schedule.ScheduleModels.AcademicEvent;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class ScheduleServiceTests {
    private static AcademicEvent event(String id, String start, String end) {
        return new AcademicEvent(id, "일정 " + id, LocalDate.parse(start), LocalDate.parse(end));
    }

    private static List<String> idsBetween(String from, String to, AcademicEvent... events) {
        var calendar = new AcademicCalendar("https://example.com/calendar", LocalDate.parse("2026-11-04"), List.of(events));
        return new ScheduleService(() -> calendar).academic(LocalDate.parse(from), LocalDate.parse(to)).schedules()
                .stream().map(AcademicEvent::scheduleId).toList();
    }

    @Test
    void eventsOverlappingTheRangeAreIncludedEvenOnTheBoundaries() {
        assertThat(idsBetween("2026-11-10", "2026-11-20",
                event("ends-before", "2026-11-01", "2026-11-09"),
                event("ends-on-first-day", "2026-11-01", "2026-11-10"),
                event("spans-whole-range", "2026-11-01", "2026-11-30"),
                event("inside", "2026-11-15", "2026-11-15"),
                event("starts-on-last-day", "2026-11-20", "2026-11-25"),
                event("starts-after", "2026-11-21", "2026-11-25")))
                .containsExactlyInAnyOrder("ends-on-first-day", "spans-whole-range", "inside", "starts-on-last-day");
    }

    @Test
    void eventsAreSortedByStartThenEndDate() {
        assertThat(idsBetween("2026-11-01", "2026-11-30",
                event("later", "2026-11-20", "2026-11-20"),
                event("same-start-long", "2026-11-05", "2026-11-09"),
                event("same-start-short", "2026-11-05", "2026-11-05")))
                .containsExactly("same-start-short", "same-start-long", "later");
    }

    @Test
    void sourceInformationIsReturnedEvenWhenNoEventMatches() {
        var calendar = new AcademicCalendar("https://example.com/calendar", LocalDate.parse("2026-11-04"), List.of());
        var result = new ScheduleService(() -> calendar).academic(LocalDate.parse("2026-11-01"), LocalDate.parse("2026-11-30"));
        assertThat(result.schedules()).isEmpty();
        assertThat(result.sourceUrl()).isEqualTo("https://example.com/calendar");
        assertThat(result.checkedAt()).isEqualTo(LocalDate.parse("2026-11-04"));
    }
}
