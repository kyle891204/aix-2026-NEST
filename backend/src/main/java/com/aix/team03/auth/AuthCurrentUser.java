package com.aix.team03.auth;

import jakarta.servlet.http.HttpServletRequest;

public final class AuthCurrentUser {
    private AuthCurrentUser() {}

    public static AuthUser require(HttpServletRequest request) {
        return AuthSessions.requireUser(request);
    }
}