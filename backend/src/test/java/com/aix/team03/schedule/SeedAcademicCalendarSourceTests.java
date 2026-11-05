package com.aix.team03.schedule;

import com.aix.team03.schedule.ScheduleModels.AcademicCalendar;
import com.aix.team03.schedule.ScheduleModels.AcademicEvent;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SeedAcademicCalendarSourceTests {
    private static final LocalDate DAY = LocalDate.parse("2026-11-10");

    private static AcademicCalendar calendarOf(AcademicEvent... events) {
        return new AcademicCalendar("https://example.com/calendar", DAY, List.of(events));
    }

    @Test
    void bundledSeedIsValidAndPointsToTheOfficialPage() {
        var calendar = new SeedAcademicCalendarSource(JsonMapper.builder().build()).calendar();
        assertThat(calendar.sourceUrl()).startsWith("https://www.hanyang.ac.kr/");
        assertThat(calendar.events()).isNotEmpty();
        assertThat(calendar.checkedAt()).isNotNull();
    }

    @Test
    void bundledSeedIdsCarryTheAcademicYearOfTheEvent() {
        var calendar = new SeedAcademicCalendarSource(JsonMapper.builder().build()).calendar();
        assertThat(calendar.events()).allSatisfy(event -> {
            var start = event.startDate();
            var academicYear = start.getMonthValue() >= 3 ? start.getYear() : start.getYear() - 1;
            assertThat(event.scheduleId()).matches("academic-" + academicYear + "-[0-9a-f]{10}-\\d+");
        });
    }

    @Test
    void missingEventsOrSourceUrlIsRejectedWithTheSameMessage() {
        var event = new AcademicEvent("a", "개강", DAY, DAY);
        assertThatThrownBy(() -> SeedAcademicCalendarSource.validated(new AcademicCalendar(
                "https://example.com/calendar", DAY, null)))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("학사일정 항목을 확인해 주세요");
        assertThatThrownBy(() -> SeedAcademicCalendarSource.validated(new AcademicCalendar(
                null, DAY, List.of(event))))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("학사일정 항목을 확인해 주세요");
        assertThatThrownBy(() -> SeedAcademicCalendarSource.validated(new AcademicCalendar(
                " ", DAY, List.of(event))))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("학사일정 항목을 확인해 주세요");
    }

    @Test
    void oneDayEventIsAccepted() {
        var calendar = calendarOf(new AcademicEvent("a", "개강", DAY, DAY));
        assertThat(SeedAcademicCalendarSource.validated(calendar)).isSameAs(calendar);
    }

    @Test
    void endDateBeforeStartDateIsRejected() {
        assertThatThrownBy(() -> SeedAcademicCalendarSource.validated(
                calendarOf(new AcademicEvent("a", "개강", DAY, DAY.minusDays(1)))))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void duplicatedIdIsRejectedBecauseSavedSchedulesPointToIt() {
        assertThatThrownBy(() -> SeedAcademicCalendarSource.validated(calendarOf(
                new AcademicEvent("a", "개강", DAY, DAY), new AcademicEvent("a", "종강", DAY, DAY))))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void missingFieldsAreRejected() {
        assertThatThrownBy(() -> SeedAcademicCalendarSource.validated(
                calendarOf(new AcademicEvent(" ", "개강", DAY, DAY)))).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> SeedAcademicCalendarSource.validated(
                calendarOf(new AcademicEvent("a", "", DAY, DAY)))).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> SeedAcademicCalendarSource.validated(
                calendarOf(new AcademicEvent("a", "개강", null, DAY)))).isInstanceOf(IllegalStateException.class);
    }
}
