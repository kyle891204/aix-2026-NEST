package com.aix.team03.schedule;

import java.time.LocalDate;
import java.util.List;

/** #10 학사일정 응답. 종일 일정만 있어 시간대 변환 없이 날짜(YYYY-MM-DD)로 주고받는다. */
public final class ScheduleModels {
    private ScheduleModels() {}

    /** scheduleId는 개인 일정에 저장할 때 출처 ID로 쓰므로 일정을 다시 옮겨도 바꾸지 않는다. 하루 일정은 시작일과 종료일이 같다. */
    public record AcademicEvent(String scheduleId, String title, LocalDate startDate, LocalDate endDate) {}

    /** sourceUrl은 공식 학사일정 페이지, checkedAt은 그 페이지와 대조한 날짜다. 일정을 넣기 전에는 null이다. */
    public record AcademicCalendar(String sourceUrl, LocalDate checkedAt, List<AcademicEvent> events) {}

    public record AcademicScheduleResponse(String sourceUrl, LocalDate checkedAt, List<AcademicEvent> schedules) {}
}
