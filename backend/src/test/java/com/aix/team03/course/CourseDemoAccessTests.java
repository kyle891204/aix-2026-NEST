package com.aix.team03.course;

import com.aix.team03.auth.AuthUser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * 배포 환경(prod,lms-demo)에서 과목알림이 로그인 보호(AuthAccessConfig)와 LMS 데모 암호로 함께 보호되는지 확인한다.
 * 로그인 확인이 먼저라서 데모 암호 검사는 로그인 세션이 있는 요청으로 확인한다.
 */
@SpringBootTest(properties = {
        "spring.profiles.active=prod,lms-demo",
        "app.lms.demo-password=fixture-demo-password",
        "app.lms.api-token="
})
class CourseDemoAccessTests {
    @Autowired WebApplicationContext context;
    private MockMvc mvc;

    @BeforeEach
    void setUp() { mvc = MockMvcBuilders.webAppContextSetup(context).build(); }

    static MockHttpSession signedIn() {
        var session = new MockHttpSession();
        session.setAttribute("nest.user", new AuthUser("google-sub", "student@example.com"));
        return session;
    }

    @Test
    void anonymousReadsAreRejectedByLoginProtectionFirst() throws Exception {
        mvc.perform(get("/api/v1/courses").header("X-LMS-Demo-Password", "fixture-demo-password"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTH_REQUIRED"));
    }

    @Test
    void signedInReadsStillRequireTheDemoPassword() throws Exception {
        for (String path : new String[] {"/api/v1/courses", "/api/v1/courses/42/notifications"}) {
            mvc.perform(get(path).session(signedIn()))
                    .andExpect(status().isUnauthorized())
                    .andExpect(header().string("Cache-Control", "no-store"))
                    .andExpect(jsonPath("$.code").value("LMS_DEMO_UNAUTHORIZED"));
            mvc.perform(get(path).session(signedIn()).header("X-LMS-Demo-Password", "incorrect"))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code").value("LMS_DEMO_UNAUTHORIZED"));
        }
    }

    @Test
    void correctPasswordReachesTheLmsClient() throws Exception {
        // Canvas 토큰을 일부러 비워 두었다. 이 오류가 나오면 로그인과 암호 검사를 모두 통과했다는 뜻이다.
        mvc.perform(get("/api/v1/courses").session(signedIn()).header("X-LMS-Demo-Password", "fixture-demo-password"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("LMS_NOT_CONFIGURED"));
    }
}

@SpringBootTest(properties = {"spring.profiles.active=prod", "app.lms.api-token="})
class CourseProductionProfileTests {
    @Autowired WebApplicationContext context;

    @Test
    void productionWithoutDemoProfileKeepsCourseRoutesDisabled() throws Exception {
        // 로그인한 사용자에게도 lms-demo 프로필이 없으면 과목알림 API 자체가 없다.
        MockMvcBuilders.webAppContextSetup(context).build()
                .perform(get("/api/v1/courses").session(CourseDemoAccessTests.signedIn()))
                .andExpect(status().isNotFound());
    }
}
