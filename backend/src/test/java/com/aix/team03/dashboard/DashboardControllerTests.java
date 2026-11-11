package com.aix.team03.dashboard;

import com.aix.team03.auth.AuthUser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** #8 공지 저장소의 공지로 요청부터 응답 형식까지 확인한다. 테스트에서는 수집을 꺼서 샘플 공지를 쓴다. */
@SpringBootTest(properties = {"spring.config.import=", "app.lms.api-token="})
class DashboardControllerTests {
    private static final String TOKEN = "csrf-fixture";

    @Autowired WebApplicationContext context;
    MockMvc mvc;

    @BeforeEach
    void setUp() { mvc = MockMvcBuilders.webAppContextSetup(context).build(); }

    // 로그인 보호·공통 CSRF 검사가 적용되어도 그대로 통과하도록 로그인 세션과 토큰을 함께 보낸다.
    private ResultActions call(String query, String json) throws Exception {
        var session = new MockHttpSession();
        session.setAttribute("nest.user", new AuthUser("google-sub", "student@example.com"));
        session.setAttribute("nest.csrf", TOKEN);
        var request = post("/api/v1/dashboard" + query).session(session).header("X-CSRF-Token", TOKEN);
        if (json != null) request.contentType(MediaType.APPLICATION_JSON).content(json);
        return mvc.perform(request);
    }

    @Test
    void returnsMatchedNoticesInTheSpecifiedShape() throws Exception {
        call("", """
                {"nationality":"VN","visaType":null,"degree":"BACHELOR","year":"2"}""")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.profileCompleted").value(false))
                .andExpect(jsonPath("$.missingProfileFields[0]").value("visaType"))
                .andExpect(jsonPath("$.matchedNotices[*].noticeId", not(hasSize(0))))
                .andExpect(jsonPath("$.matchedNotices[*].matchStatus", everyItem(not("NOT_APPLICABLE"))))
                .andExpect(jsonPath("$.matchedNotices[0].matchReasons").isArray())
                .andExpect(jsonPath("$.matchedNotices[0].analysisStatus").exists())
                .andExpect(jsonPath("$.matchedNotices[0].savedScheduleId").isEmpty());
    }

    @Test
    void collegeNoticesAreShownOnlyToStudentsOfThatCollege() throws Exception {
        // coll-002는 computing 단과대의 마감 없는 샘플 공지다.
        call("?limit=50", "{}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.matchedNotices[*].noticeId", not(hasItem("coll-002"))));
        call("?limit=50", "{\"collegeId\":\"computing\"}")
                .andExpect(jsonPath("$.matchedNotices[*].noticeId", hasItem("coll-002")));
        call("?limit=50", "{\"collegeId\":\"design\"}")
                .andExpect(jsonPath("$.matchedNotices[*].noticeId", not(hasItem("coll-002"))));
    }

    @Test
    void anonymousRequestIsRejectedByLoginProtection() throws Exception {
        mvc.perform(post("/api/v1/dashboard").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTH_REQUIRED"));
    }

    @Test
    void missingBodyIsJudgedAsAnEmptyProfile() throws Exception {
        call("", null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.profileCompleted").value(false))
                .andExpect(jsonPath("$.missingProfileFields", hasSize(4)));
    }

    @Test
    void limitOutsideOneToFiftyIsAnInvalidRequest() throws Exception {
        for (String query : new String[] {"?limit=0", "?limit=51", "?limit=abc"}) {
            call(query, "{}")
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
                    .andExpect(jsonPath("$.fields.limit").exists());
        }
        call("?limit=1", "{}").andExpect(jsonPath("$.matchedNotices", hasSize(1)));
    }

    @Test
    void overlongProfileValueIsTreatedAsMissingInsteadOfBlocking() throws Exception {
        // 저장된 프로필 값이 길어도 대시보드가 계속 400으로 막히지 않아야 한다.
        call("", "{\"nationality\":\"" + "x".repeat(200) + "\",\"degree\":\"BACHELOR\",\"year\":\"2\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.missingProfileFields[0]").value("nationality"));
    }

    @Test
    void malformedJsonUsesTheCommonErrorFormat() throws Exception {
        call("", "{\"nationality\":")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
                .andExpect(jsonPath("$.fields.body").exists());
    }
}
