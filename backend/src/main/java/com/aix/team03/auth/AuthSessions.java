package com.aix.team03.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import org.springframework.http.HttpStatus;

final class AuthSessions {
    static final String USER = "nest.user";
    static final String CSRF = "nest.csrf";
    static final String NONCE = "nest.nonce";
    static final String CHALLENGE_TIME = "nest.challenge-time";
    private static final SecureRandom RANDOM = new SecureRandom();

    private AuthSessions() {}

    static void prepare(HttpSession session) {
        synchronized (session) {
            if (session.getAttribute(CSRF) == null) session.setAttribute(CSRF, randomToken());
            Instant created = (Instant) session.getAttribute(CHALLENGE_TIME);
            if (created == null || created.plusSeconds(600).isBefore(Instant.now())) {
                session.setAttribute(NONCE, randomToken());
                session.setAttribute(CHALLENGE_TIME, Instant.now());
            }
        }
    }

    static HttpSession checkCsrf(HttpServletRequest request) {
        var session = request.getSession(false);
        String supplied = request.getHeader("X-CSRF-Token");
        String expected = session == null ? null : (String) session.getAttribute(CSRF);
        if (expected == null || supplied == null || !MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8), supplied.getBytes(StandardCharsets.UTF_8))) {
            throw new AuthException("AUTH_CSRF_INVALID", "로그인 화면을 새로 불러온 뒤 다시 시도해 주세요.", HttpStatus.FORBIDDEN);
        }
        return session;
    }

    static AuthUser currentUser(HttpServletRequest request) {
        var session = request.getSession(false);
        return session == null ? null : (AuthUser) session.getAttribute(USER);
    }

    static AuthUser requireUser(HttpServletRequest request) {
        var user = currentUser(request);
        if (user == null) throw new AuthException("AUTH_REQUIRED", "로그인이 필요합니다.", HttpStatus.UNAUTHORIZED);
        return user;
    }

    private static String randomToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
