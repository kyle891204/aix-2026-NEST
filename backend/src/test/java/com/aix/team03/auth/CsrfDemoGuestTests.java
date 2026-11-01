package com.aix.team03.auth;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {"spring.config.import=", "app.lms.api-token=", "app.auth.demo-guest=true"})
@Import(CsrfAccessTests.ProbeController.class)
class CsrfDemoGuestTests {
    @Autowired WebApplicationContext context;
    MockMvc mvc;

    @BeforeEach
    void setUp() { mvc = MockMvcBuilders.webAppContextSetup(context).build(); }

    @Test
    void firstWriteCreatesGuestSessionButIsRejectedWithoutToken() throws Exception {
        var session = (MockHttpSession) mvc.perform(post(CsrfAccessTests.PROTECTED))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("AUTH_CSRF_INVALID"))
                .andReturn().getRequest().getSession(false);

        assertThat(session.getAttribute(AuthSessions.USER)).isNotNull();
    }

    @Test
    void guestWriteNeedsTheTokenFromItsSession() throws Exception {
        var result = mvc.perform(get("/api/v1/auth/session"))
                .andExpect(status().isOk())
                .andReturn();
        var session = (MockHttpSession) result.getRequest().getSession(false);
        String token = JsonPath.read(result.getResponse().getContentAsString(), "$.csrfToken");

        mvc.perform(post(CsrfAccessTests.PROTECTED).session(session).header("X-CSRF-Token", token))
                .andExpect(status().isOk());
        mvc.perform(post(CsrfAccessTests.PROTECTED).session(session))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("AUTH_CSRF_INVALID"));
    }
}
