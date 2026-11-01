package com.aix.team03.course;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** 배포 환경(prod,lms-demo)에서 과목알림도 기존 LMS 데모와 같은 암호로 보호되는지 확인한다. */
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

    @Test
    void courseReadsRequireTheDemoPassword() throws Exception {
        for (String path : new String[] {"/api/v1/courses", "/api/v1/courses/42/notifications"}) {
            mvc.perform(get(path))
                    .andExpect(status().isUnauthorized())
                    .andExpect(header().string("Cache-Control", "no-store"))
                    .andExpect(jsonPath("$.code").value("LMS_DEMO_UNAUTHORIZED"));
            mvc.perform(get(path).header("X-LMS-Demo-Password", "incorrect"))
                    .andExpect(status().isUnauthorized());
        }
    }

    @Test
    void correctPasswordReachesTheLmsClient() throws Exception {
        // Canvas 토큰을 일부러 비워 두었다. 이 오류가 나오면 암호 검사를 통과했다는 뜻이다.
        mvc.perform(get("/api/v1/courses").header("X-LMS-Demo-Password", "fixture-demo-password"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("LMS_NOT_CONFIGURED"));
    }
}

@SpringBootTest(properties = {"spring.profiles.active=prod", "app.lms.api-token="})
class CourseProductionProfileTests {
    @Autowired WebApplicationContext context;

    @Test
    void productionWithoutDemoProfileKeepsCourseRoutesDisabled() throws Exception {
        MockMvcBuilders.webAppContextSetup(context).build()
                .perform(get("/api/v1/courses"))
                .andExpect(status().isNotFound());
    }
}
