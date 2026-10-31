package com.aix.team03.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Set;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Checks the session CSRF token on writes. /auth checks its own token in AuthController. */
@Configuration
public class CsrfAccessConfig implements WebMvcConfigurer {
    private static final Set<String> WRITE_METHODS = Set.of("POST", "PUT", "PATCH", "DELETE");

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new HandlerInterceptor() {
            @Override
            public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
                if (WRITE_METHODS.contains(request.getMethod())) AuthSessions.checkCsrf(request);
                return true;
            }
        // Runs after AuthAccessConfig (order 0) so a signed-out write stays 401, not 403.
        }).addPathPatterns("/api/v1/**").excludePathPatterns("/api/v1/auth/**").order(1);
    }
}
