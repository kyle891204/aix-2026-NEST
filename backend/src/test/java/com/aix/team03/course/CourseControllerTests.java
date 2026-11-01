package com.aix.team03.course;

import com.aix.team03.auth.AuthUser;
import com.aix.team03.integrations.lms.LmsIntegrationException;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.EnumSet;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import static com.aix.team03.course.CourseModels.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {"spring.config.import=", "app.lms.api-token="})
class CourseControllerTests {
    @Autowired WebApplicationContext context;
    @MockitoBean CourseService courses;
    MockMvc mvc;

    @BeforeEach
    void setUp() { mvc = MockMvcBuilders.webAppContextSetup(context).build(); }

    // 로그인 보호 경로가 등록되면 비로그인 요청은 막히므로, 테스트는 처음부터 로그인 세션으로 호출한다.
    private ResultActions call(String path) throws Exception {
        var session = new MockHttpSession();
        session.setAttribute("nest.user", new AuthUser("google-sub", "student@example.com"));
        return mvc.perform(get(path).session(session));
    }

    @Test
    void courseListUsesTheSpecifiedShape() throws Exception {
        when(courses.courses()).thenReturn(new CourseList(
                List.of(new CourseSummary("12", "자료구조", "CSE2010", null)), false));

        call("/api/v1/courses")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.courses[0].courseId").value("12"))
                .andExpect(jsonPath("$.courses[0].courseName").value("자료구조"))
                .andExpect(jsonPath("$.courses[0].courseCode").value("CSE2010"))
                .andExpect(jsonPath("$.courses[0].termName").isEmpty())
                .andExpect(jsonPath("$.truncated").value(false));
    }

    @Test
    void notificationsDefaultToAllTypesAndTheLastNinetyDays() throws Exception {
        when(courses.notifications(anyLong(), any(), any(), any())).thenReturn(new CourseNotifications("12",
                List.of(new Notification("assignment-22", NotificationType.ASSIGNMENT, "9주차 과제", null,
                        "2026-11-03T14:59:00Z", null, null, null, "https://lms.test/as/22", null)),
                List.of(new NotificationError(NotificationType.MATERIAL, "LMS_CONNECTION_FAILED")), true));

        call("/api/v1/courses/12/notifications")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.courseId").value("12"))
                .andExpect(jsonPath("$.notifications[0].type").value("ASSIGNMENT"))
                .andExpect(jsonPath("$.notifications[0].dueAt").value("2026-11-03T14:59:00Z"))
                .andExpect(jsonPath("$.notifications[0].savedScheduleId").isEmpty())
                .andExpect(jsonPath("$.errors[0].type").value("MATERIAL"))
                .andExpect(jsonPath("$.errors[0].code").value("LMS_CONNECTION_FAILED"))
                .andExpect(jsonPath("$.truncated").value(true));

        LocalDate today = LocalDate.now(ZoneId.of("Asia/Seoul"));
        verify(courses).notifications(12, EnumSet.allOf(NotificationType.class), today.minusDays(90), today);
    }

    @Test
    void typeAndDatesAreForwarded() throws Exception {
        call("/api/v1/courses/12/notifications?type=MATERIAL&startDate=2026-09-01&endDate=2026-09-30")
                .andExpect(status().isOk());
        verify(courses).notifications(12, EnumSet.of(NotificationType.MATERIAL),
                LocalDate.of(2026, 9, 1), LocalDate.of(2026, 9, 30));
    }

    @Test
    void onlyOneDateFillsTheOtherWithinNinetyDays() throws Exception {
        // 종료일만 보내면 그 전 90일, 시작일만 보내면 오늘까지 조회한다.
        call("/api/v1/courses/12/notifications?endDate=2026-03-31").andExpect(status().isOk());
        verify(courses).notifications(12, EnumSet.allOf(NotificationType.class),
                LocalDate.of(2026, 3, 31).minusDays(90), LocalDate.of(2026, 3, 31));

        LocalDate today = LocalDate.now(ZoneId.of("Asia/Seoul"));
        call("/api/v1/courses/12/notifications?startDate=" + today.minusDays(10)).andExpect(status().isOk());
        verify(courses).notifications(12, EnumSet.allOf(NotificationType.class), today.minusDays(10), today);
    }

    @Test
    void unknownTypeIsAnInvalidRequest() throws Exception {
        call("/api/v1/courses/12/notifications?type=QUIZ")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
                .andExpect(jsonPath("$.fields.type").exists());
        verifyNoInteractions(courses);
    }

    @Test
    void malformedDateAndCourseIdAreInvalidRequests() throws Exception {
        call("/api/v1/courses/12/notifications?startDate=2026/09/01")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.startDate").value("YYYY-MM-DD 형식이어야 합니다."));
        call("/api/v1/courses/abc/notifications")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.courseId").value("숫자여야 합니다."));
        verifyNoInteractions(courses);
    }

    @Test
    void lmsFailuresKeepTheLmsErrorFormat() throws Exception {
        when(courses.courses()).thenThrow(new LmsIntegrationException("LMS_TOKEN_REJECTED",
                "LMS가 토큰을 거부했습니다.", HttpStatus.BAD_GATEWAY, 401));

        call("/api/v1/courses")
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.code").value("LMS_TOKEN_REJECTED"))
                .andExpect(jsonPath("$.upstreamStatus").value(401));
    }
}
