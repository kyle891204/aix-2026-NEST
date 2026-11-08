package com.aix.team03.schedule;

import com.aix.team03.auth.AuthUser;
import com.aix.team03.schedule.ScheduleModels.AcademicCalendar;
import com.aix.team03.schedule.ScheduleModels.AcademicEvent;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** 실제 학사일정과 상관없이 응답 형식을 확인하도록 테스트 전용 일정을 쓴다. */
@SpringBootTest(properties = {"spring.config.import=", "app.lms.api-token="})
class ScheduleControllerTests {
    @Autowired WebApplicationContext context;
    @MockitoBean AcademicCalendarSource source;
    MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.webAppContextSetup(context).build();
        when(source.calendar()).thenReturn(new AcademicCalendar("https://example.com/calendar",
                LocalDate.parse("2026-11-04"), List.of(new AcademicEvent("fixture-withdrawal", "테스트 일정",
                        LocalDate.parse("2026-11-02"), LocalDate.parse("2026-11-06")))));
    }

    private ResultActions call(String query) throws Exception {
        var session = new MockHttpSession();
        session.setAttribute("nest.user", new AuthUser("google-sub", "student@example.com"));
        return mvc.perform(get("/api/v1/schedules/academic" + query).session(session));
    }

    @Test
    void returnsAcademicSchedulesInTheSpecifiedShape() throws Exception {
        call("?from=2026-11-01&to=2026-11-30")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sourceUrl").value("https://example.com/calendar"))
                .andExpect(jsonPath("$.checkedAt").value("2026-11-04"))
                .andExpect(jsonPath("$.schedules[0].scheduleId").value("fixture-withdrawal"))
                .andExpect(jsonPath("$.schedules[0].title").value("테스트 일정"))
                .andExpect(jsonPath("$.schedules[0].startDate").value("2026-11-02"))
                .andExpect(jsonPath("$.schedules[0].endDate").value("2026-11-06"));
    }

    @Test
    void leapAcademicYearOf366DaysIsAllowed() throws Exception {
        call("?from=2027-03-01&to=2028-02-29").andExpect(status().isOk());
    }

    @Test
    void missingOrMalformedDatesAreRejected() throws Exception {
        call("?to=2026-11-30").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
                .andExpect(jsonPath("$.fields.from").exists());
        call("?from=2026-11-01").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.to").exists());
        call("?from=2026/11/01&to=2026-11-30").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.from").exists());
    }

    @Test
    void reversedOrTooLongRangesAreRejected() throws Exception {
        call("?from=2026-11-30&to=2026-11-01").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.to").exists());
        // 시작일과 종료일을 모두 세면 367일이다.
        call("?from=2026-01-01&to=2027-01-02").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.to").exists());
    }

    @Test
    void anonymousRequestIsRejectedByLoginProtection() throws Exception {
        mvc.perform(get("/api/v1/schedules/academic?from=2026-11-01&to=2026-11-30"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTH_REQUIRED"));
    }
}
