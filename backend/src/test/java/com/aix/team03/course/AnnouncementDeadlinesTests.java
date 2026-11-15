package com.aix.team03.course;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

/** 자동 테스트용: 과목 공지 본문에서 마감 문구를 어떻게 찾고, 마감이 아닌 날짜는 어떻게 거르는지 검사한다. */
class AnnouncementDeadlinesTests {
    private static final String POSTED = "2026-11-11T11:55:00Z";

    private static String find(String html) {
        return AnnouncementDeadlines.find(html, POSTED);
    }

    @Test
    void findsDateWithTimeBeforeUntil() {
        assertThat(find("<p>보고서는 11/20(금) 23:59까지 제출하세요.</p>")).isEqualTo("2026-11-20T23:59:00+09:00");
        assertThat(find("<p>11월 20일 오후 6시까지 LMS에 올려 주세요.</p>")).isEqualTo("2026-11-20T18:00:00+09:00");
        assertThat(find("2026.11.27 마감")).isEqualTo("2026-11-27T23:59:00+09:00");
    }

    @Test
    void dateWithoutTimeEndsAtTheEndOfTheDay() {
        assertThat(find("<div>11월 20일까지 신청</div>")).isEqualTo("2026-11-20T23:59:00+09:00");
    }

    @Test
    void readsTheEndOfARangeAndLabelledDeadlines() {
        assertThat(find("신청 기간: 11/10(월) ~ 11/14(금)")).isEqualTo("2026-11-14T23:59:00+09:00");
        assertThat(find("제출 마감: 12월 1일 14:00")).isEqualTo("2026-12-01T14:00:00+09:00");
        assertThat(find("Deadline: 11/30 18:00")).isEqualTo("2026-11-30T18:00:00+09:00");
    }

    @Test
    void earlyYearDateInAYearEndNoticeIsNextYear() {
        assertThat(AnnouncementDeadlines.find("1/5까지 제출", "2026-12-20T01:00:00Z"))
                .isEqualTo("2027-01-05T23:59:00+09:00");
        assertThat(AnnouncementDeadlines.find("2월 10일까지 신청", "2026-11-30T01:00:00Z"))
                .isEqualTo("2027-02-10T23:59:00+09:00");
    }

    @Test
    void pastDateWithoutYearStaysInThePostingYear() {
        // 리뷰에서 찾은 경우: 11월 공지의 지난 날짜가 다음 해 마감이 되면 안 된다. 올해로 두어 "마감 지남"으로 보인다.
        assertThat(find("10/30까지 제출한 과제의 성적을 공개합니다.")).isEqualTo("2026-10-30T23:59:00+09:00");
        assertThat(find("9월 1일까지 신청")).isEqualTo("2026-09-01T23:59:00+09:00");
    }

    @Test
    void lastYearEndDateInAnEarlyYearNoticeIsLastYear() {
        assertThat(AnnouncementDeadlines.find("12/20까지 제출한 과제를 채점했어요.", "2027-01-10T01:00:00Z"))
                .isEqualTo("2026-12-20T23:59:00+09:00");
    }

    @Test
    void datesThatAreNotDeadlinesAreIgnored() {
        assertThat(find("<p>11/12(수) 수업은 휴강입니다. 보강은 11/19에 합니다.</p>")).isNull();
        assertThat(find("성적평가방법: 중간 30%, 기말 40%, 과제 3.5점")).isNull();
        assertThat(find("")).isNull();
        assertThat(find(null)).isNull();
        // 달력에 없는 날짜는 마감으로 쓰지 않는다.
        assertThat(find("2/30까지 제출")).isNull();
    }
}
