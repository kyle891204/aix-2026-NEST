package com.aix.team03.auth;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
        "spring.config.import=",
        "app.lms.api-token=",
        "app.auth.demo-guest=true"
})
class AuthDemoGuestTests {
    @Autowired WebApplicationContext context;
    @MockitoBean GoogleTokenVerifier verifier;
    MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.webAppContextSetup(context).build();
        when(verifier.clientId()).thenReturn("fixture.apps.googleusercontent.com");
    }

    @Test
    void existingLoginIsNotReplacedByGuest() throws Exception {
        var session = new MockHttpSession();
        var user = new AuthUser("google-sub-7", "student@example.test");
        session.setAttribute(AuthSessions.USER, user);

        mvc.perform(get("/api/v1/auth/session").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.id").value(user.id()))
                .andExpect(jsonPath("$.user.email").value(user.email()))
                .andExpect(jsonPath("$.csrfToken").isNotEmpty());

        mvc.perform(get("/api/v1/auth/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(user.id()));
    }

    @Test
    void guestLogoutStillRequiresCsrf() throws Exception {
        var session = (MockHttpSession) mvc.perform(
                        get("/api/v1/auth/session"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.csrfToken").isNotEmpty())
                .andReturn().getRequest().getSession(false);

        mvc.perform(post("/api/v1/auth/logout").session(session))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("AUTH_CSRF_INVALID"));

        assertThat(session.isInvalid()).isFalse();

        mvc.perform(post("/api/v1/auth/logout")
                        .session(session)
                        .header("X-CSRF-Token",
                                session.getAttribute(AuthSessions.CSRF)))
                .andExpect(status().isOk());

        assertThat(session.isInvalid()).isTrue();
    }
}