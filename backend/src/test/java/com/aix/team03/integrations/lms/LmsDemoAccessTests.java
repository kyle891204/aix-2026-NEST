package com.aix.team03.integrations.lms;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
        "spring.profiles.active=prod,lms-demo",
        "app.lms.demo-password=fixture-demo-password",
        "app.lms.api-token=",
        "app.cors.allowed-origins=https://aix-2026-nest.vercel.app"
})
class LmsDemoAccessTests {
    @Autowired WebApplicationContext context;
    private MockMvc mvc;

    @BeforeEach
    void setUp() { mvc = MockMvcBuilders.webAppContextSetup(context).build(); }

    @Test
    void allDemoReadsRequireTheDemoPassword() throws Exception {
        for (String path : new String[] {"/profile", "/courses", "/courses/42", "/announcements?courseId=42",
                "/courses/42/assignments", "/courses/42/modules", "/courses/42/modules/8/items"}) {
            mvc.perform(get("/api/v1/dev/lms" + path))
                    .andExpect(status().isUnauthorized())
                    .andExpect(header().string("Cache-Control", "no-store"))
                    .andExpect(jsonPath("$.code").value("LMS_DEMO_UNAUTHORIZED"));
        }
    }

    @Test
    void incorrectPasswordIsRejectedWithCorsHeaders() throws Exception {
        mvc.perform(get("/api/v1/dev/lms/profile")
                        .header("Origin", "https://aix-2026-nest.vercel.app")
                        .header("X-LMS-Demo-Password", "incorrect"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string("Access-Control-Allow-Origin", "https://aix-2026-nest.vercel.app"));
    }

    @Test
    void correctPasswordReachesTheLmsClientWithoutExposingSecrets() throws Exception {
        // The Canvas token is deliberately absent: reaching this error proves the demo gate passed.
        mvc.perform(get("/api/v1/dev/lms/profile")
                        .header("X-LMS-Demo-Password", "fixture-demo-password"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.code").value("LMS_NOT_CONFIGURED"));
    }

    @Test
    void browserCanPreflightThePasswordHeader() throws Exception {
        mvc.perform(options("/api/v1/dev/lms/profile")
                        .header("Origin", "https://aix-2026-nest.vercel.app")
                        .header("Access-Control-Request-Method", "GET")
                        .header("Access-Control-Request-Headers", "X-LMS-Demo-Password"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Headers", "X-LMS-Demo-Password"));
    }
}

@SpringBootTest(properties = {
        "spring.profiles.active=prod,lms-demo",
        "app.lms.demo-password=",
        "app.lms.api-token="
})
class LmsDemoUnconfiguredTests {
    @Autowired WebApplicationContext context;

    @Test
    void demoWithoutPasswordFailsClosed() throws Exception {
        MockMvcBuilders.webAppContextSetup(context).build()
                .perform(get("/api/v1/dev/lms/profile").header("X-LMS-Demo-Password", "anything"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("LMS_DEMO_NOT_CONFIGURED"));
    }
}

@SpringBootTest(properties = {"spring.profiles.active=prod", "app.lms.api-token="})
class LmsProductionProfileTests {
    @Autowired WebApplicationContext context;

    @Test
    void productionWithoutExplicitDemoProfileKeepsLmsRoutesDisabled() throws Exception {
        MockMvcBuilders.webAppContextSetup(context).build()
                .perform(get("/api/v1/dev/lms/profile"))
                .andExpect(status().isNotFound());
    }
}
