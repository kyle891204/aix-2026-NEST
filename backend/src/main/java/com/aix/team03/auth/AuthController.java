package com.aix.team03.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final GoogleTokenVerifier verifier;

    public AuthController(GoogleTokenVerifier verifier) { this.verifier = verifier; }

    @GetMapping("/session")
    public SessionResponse session(HttpServletRequest request) {
        var session = request.getSession(true);
        AuthSessions.prepare(session);
        return new SessionResponse(AuthSessions.currentUser(request), verifier.clientId(),
                (String) session.getAttribute(AuthSessions.CSRF), (String) session.getAttribute(AuthSessions.NONCE));
    }

    @PostMapping(value = "/google", consumes = MediaType.APPLICATION_JSON_VALUE)
    public SessionResponse login(@Valid @RequestBody GoogleLoginRequest body, HttpServletRequest request) {
        var previous = AuthSessions.checkCsrf(request);
        Instant created = (Instant) previous.getAttribute(AuthSessions.CHALLENGE_TIME);
        if (created == null || created.plusSeconds(600).isBefore(Instant.now())) {
            throw new AuthException("AUTH_CHALLENGE_EXPIRED", "로그인 시간이 지났습니다. 다시 시도해 주세요.", HttpStatus.UNAUTHORIZED);
        }
        var user = verifier.verify(body.credential(), (String) previous.getAttribute(AuthSessions.NONCE));
        // Discard the pre-login session and its one-time nonce (session fixation/replay protection).
        previous.invalidate();
        request.getSession(true).setAttribute(AuthSessions.USER, user);
        return session(request);
    }

    @GetMapping("/me")
    public AuthUser me(HttpServletRequest request) { return AuthSessions.requireUser(request); }

    @PostMapping("/logout")
    public LogoutResponse logout(HttpServletRequest request) {
        AuthSessions.checkCsrf(request).invalidate();
        return new LogoutResponse(true);
    }

    public record GoogleLoginRequest(@NotBlank @Size(max = 16384) String credential) {}
    public record SessionResponse(AuthUser user, String googleClientId, String csrfToken, String nonce) {}
    public record LogoutResponse(boolean loggedOut) {}
}
