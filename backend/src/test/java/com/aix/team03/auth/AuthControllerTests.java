package com.aix.team03.auth;

import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {"spring.config.import=", "app.lms.api-token="})
class AuthControllerTests {
    @Autowired WebApplicationContext context;
    @MockitoBean GoogleTokenVerifier verifier;
    MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.webAppContextSetup(context).build();
        when(verifier.clientId()).thenReturn("fixture.apps.googleusercontent.com");
    }

    private MockHttpSession bootstrap() throws Exception {
        return (MockHttpSession) mvc.perform(get("/api/v1/auth/session"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.user").isEmpty())
                .andExpect(jsonPath("$.csrfToken").isNotEmpty())
                .andExpect(jsonPath("$.nonce").isNotEmpty())
                .andReturn().getRequest().getSession(false);
    }

    @Test
    void anonymousSessionCannotReadIdentity() throws Exception {
        mvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTH_REQUIRED"));
    }

    @Test
    void loginRequiresMatchingSessionCsrfToken() throws Exception {
        var session = bootstrap();
        mvc.perform(post("/api/v1/auth/google").session(session)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"credential\":\"fixture\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("AUTH_CSRF_INVALID"));
        verify(verifier, never()).verify(anyString(), anyString());
    }

    @Test
    void bothLocalViteOriginsReachLoginValidationThroughTheProxy() throws Exception {
        for (String origin : new String[] {"http://localhost:5173", "http://127.0.0.1:5173"}) {
            var session = bootstrap();
            mvc.perform(post("/api/v1/auth/google").session(session)
                            .header("Origin", origin)
                            .header("X-CSRF-Token", session.getAttribute(AuthSessions.CSRF))
                            .contentType(MediaType.APPLICATION_JSON).content("{\"credential\":\"\"}"))
                    .andExpect(status().isBadRequest())
                    .andExpect(header().string("Access-Control-Allow-Origin", origin))
                    .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
        }
    }

    @Test
    void untrustedOriginCannotSubmitLogin() throws Exception {
        var session = bootstrap();
        mvc.perform(post("/api/v1/auth/google").session(session)
                        .header("Origin", "https://untrusted.example")
                        .header("X-CSRF-Token", session.getAttribute(AuthSessions.CSRF))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"credential\":\"fixture\"}"))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
        verify(verifier, never()).verify(anyString(), anyString());
    }

    @Test
    void validLoginRotatesSessionThenLogoutRevokesIt() throws Exception {
        var previous = bootstrap();
        String nonce = (String) previous.getAttribute(AuthSessions.NONCE);
        when(verifier.verify("fixture", nonce)).thenReturn(new AuthUser("google-sub-7", "student@example.test"));
        var result = mvc.perform(post("/api/v1/auth/google").session(previous)
                        .header("X-CSRF-Token", previous.getAttribute(AuthSessions.CSRF))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"credential\":\"fixture\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.email").value("student@example.test"))
                .andExpect(jsonPath("$.credential").doesNotExist())
                .andReturn();
        var authenticated = (MockHttpSession) result.getRequest().getSession(false);
        assertThat(previous.isInvalid()).isTrue();
        assertThat(authenticated.getId()).isNotEqualTo(previous.getId());
        assertThat(authenticated.getAttribute(AuthSessions.NONCE)).isNotEqualTo(nonce);
        mvc.perform(get("/api/v1/auth/me").session(authenticated))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value("google-sub-7"));
        mvc.perform(post("/api/v1/auth/logout").session(authenticated))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/auth/logout").session(authenticated)
                        .header("X-CSRF-Token", authenticated.getAttribute(AuthSessions.CSRF)))
                .andExpect(status().isOk());
        assertThat(authenticated.isInvalid()).isTrue();
        mvc.perform(get("/api/v1/auth/me")).andExpect(status().isUnauthorized());
    }

    @Test
    void expiredChallengeAndInvalidTokenDoNotAuthenticate() throws Exception {
        var session = bootstrap();
        session.setAttribute(AuthSessions.CHALLENGE_TIME, Instant.now().minusSeconds(601));
        mvc.perform(post("/api/v1/auth/google").session(session)
                        .header("X-CSRF-Token", session.getAttribute(AuthSessions.CSRF))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"credential\":\"fixture\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTH_CHALLENGE_EXPIRED"));
        assertThat(session.getAttribute(AuthSessions.USER)).isNull();
        verify(verifier, never()).verify(anyString(), anyString());

        session.setAttribute(AuthSessions.CHALLENGE_TIME, Instant.now());
        when(verifier.verify(anyString(), anyString())).thenThrow(new AuthException(
                "AUTH_INVALID_CREDENTIAL", "인증 실패", org.springframework.http.HttpStatus.UNAUTHORIZED));
        mvc.perform(post("/api/v1/auth/google").session(session)
                        .header("X-CSRF-Token", session.getAttribute(AuthSessions.CSRF))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"credential\":\"invalid\"}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/auth/me").session(session)).andExpect(status().isUnauthorized());
    }

    @Test
    void rejectsBlankCredentialBeforeVerifyingIt() throws Exception {
        var session = bootstrap();
        mvc.perform(post("/api/v1/auth/google").session(session)
                        .header("X-CSRF-Token", session.getAttribute(AuthSessions.CSRF))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"credential\":\"\"}"))
                .andExpect(status().isBadRequest());
        verify(verifier, never()).verify(anyString(), anyString());
    }
}
