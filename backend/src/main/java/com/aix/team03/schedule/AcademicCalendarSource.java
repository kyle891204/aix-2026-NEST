package com.aix.team03.schedule;

import com.aix.team03.schedule.ScheduleModels.AcademicCalendar;

/** 학사일정을 받는 창구. 학교가 자동 수집을 허용하면 그 구현으로 바꾼다. */
public interface AcademicCalendarSource {
    AcademicCalendar calendar();
}
