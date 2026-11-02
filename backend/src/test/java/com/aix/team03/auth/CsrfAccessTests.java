package com.aix.team03.auth;

import com.jayway.jsonpath.JsonPath;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.WebApplicationContext;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {"spring.config.import=", "app.lms.api-token=", "app.auth.demo-guest=false"})
@Import(CsrfAccessTests.ProbeController.class)
class CsrfAccessTests {
    private static final String TOKEN = "csrf-fixture";
    static final String PROTECTED = "/api/v1/community/csrf-probe";
    private static final String PUBLIC = "/api/v1/csrf-probe";
    private static final List<HttpMethod> WRITES =
            List.of(HttpMethod.POST, HttpMethod.PUT, HttpMethod.PATCH, HttpMethod.DELETE);

    @Autowired WebApplicationContext context;
    MockMvc mvc;

    @BeforeEach
    void setUp() { mvc = MockMvcBuilders.webAppContextSetup(context).build(); }

    private MockHttpSession signedIn() {
        var session = new MockHttpSession();
        session.setAttribute(AuthSessions.USER, new AuthUser("google-sub", "student@example.com"));
        session.setAttribute(AuthSessions.CSRF, TOKEN);
        return session;
    }

    @Test
    void writesWithoutTokenAreRejected() throws Exception {
        for (var method : WRITES) {
            mvc.perform(request(method, PROTECTED).session(signedIn()))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.code").value("AUTH_CSRF_INVALID"))
                    .andExpect(jsonPath("$.fields").isEmpty());
        }
    }

    @Test
    void writesWithWrongTokenAreRejected() throws Exception {
        for (var method : WRITES) {
            mvc.perform(request(method, PROTECTED).session(signedIn()).header("X-CSRF-Token", "wrong"))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.code").value("AUTH_CSRF_INVALID"));
        }
    }

    @Test
    void writesWithSessionTokenPass() throws Exception {
        for (var method : WRITES) {
            mvc.perform(request(method, PROTECTED).session(signedIn()).header("X-CSRF-Token", TOKEN))
                    .andExpect(status().isOk());
        }
    }

    @Test
    void tokenFromAnotherSessionIsRejected() throws Exception {
        var other = signedIn();
        other.setAttribute(AuthSessions.CSRF, "another-session-token");
        mvc.perform(post(PROTECTED).session(other).header("X-CSRF-Token", TOKEN))
                .andExpect(status().isForbidden());
    }

    @Test
    void tokenFromSessionResponseIsAccepted() throws Exception {
        var session = signedIn();
        session.removeAttribute(AuthSessions.CSRF);
        var body = mvc.perform(get("/api/v1/auth/session").session(session))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String token = JsonPath.read(body, "$.csrfToken");

        mvc.perform(post(PROTECTED).session(session).header("X-CSRF-Token", token))
                .andExpect(status().isOk());
    }

    @Test
    void readsDoNotNeedToken() throws Exception {
        mvc.perform(get(PROTECTED).session(signedIn())).andExpect(status().isOk());
    }

    @Test
    void preflightDoesNotNeedToken() throws Exception {
        mvc.perform(options(PROTECTED)
                        .header(HttpHeaders.ORIGIN, "http://localhost:5173")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST"))
                .andExpect(status().isOk());
    }

    @Test
    void signedOutWriteOnProtectedPathStaysUnauthorized() throws Exception {
        mvc.perform(post(PROTECTED))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTH_REQUIRED"));
    }

    @Test
    void writeOnUnprotectedPathWithoutSessionIsRejected() throws Exception {
        mvc.perform(post(PUBLIC))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("AUTH_CSRF_INVALID"));
    }

    @Test
    void logoutKeepsItsOwnTokenCheck() throws Exception {
        mvc.perform(post("/api/v1/auth/logout").session(signedIn()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("AUTH_CSRF_INVALID"));
        mvc.perform(post("/api/v1/auth/logout").session(signedIn()).header("X-CSRF-Token", TOKEN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.loggedOut").value(true));
    }

    @RestController
    static class ProbeController {
        private static final Map<String, Boolean> OK = Map.of("ok", true);

        @GetMapping({PROTECTED, PUBLIC}) Map<String, Boolean> read() { return OK; }
        @PostMapping({PROTECTED, PUBLIC}) Map<String, Boolean> create() { return OK; }
        @PutMapping({PROTECTED, PUBLIC}) Map<String, Boolean> replace() { return OK; }
        @PatchMapping({PROTECTED, PUBLIC}) Map<String, Boolean> update() { return OK; }
        @DeleteMapping({PROTECTED, PUBLIC}) Map<String, Boolean> delete() { return OK; }
    }
}
