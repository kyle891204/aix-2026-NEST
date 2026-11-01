package com.aix.team03.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsUtils;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.beans.factory.annotation.Value;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Configuration
public class AuthAccessConfig implements WebMvcConfigurer {
    private static final Logger log =
            LoggerFactory.getLogger(AuthAccessConfig.class);

    private final boolean demoGuest;

    public AuthAccessConfig(
            @Value("${app.auth.demo-guest:false}") boolean demoGuest
    ) {
        this.demoGuest = demoGuest;

        if (demoGuest) {
            log.warn("AUTH_DEMO_GUEST is enabled: anonymous requests may use guest sessions.");
        }
    }
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new HandlerInterceptor() {
            @Override
            public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
                response.setHeader("Cache-Control", "no-store");
                return true;
            }
        }).addPathPatterns(
                "/api/v1/auth/**",
                "/api/v1/profiles/**",
                "/api/v1/notices/**",
                "/api/v1/community/**",
                "/api/v1/schedule/**",
                "/api/v1/courses/**",
                "/api/v1/dashboard/**",
                "/api/v1/schedules/**"
        );

        registry.addInterceptor(new HandlerInterceptor() {
            @Override
            public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
                if (CorsUtils.isPreFlightRequest(request)) {
                    return true;
                }

                if (demoGuest) {
                    AuthSessions.prepareGuest(request);
                }

                AuthSessions.requireUser(request);
                return true;
            }
        }).addPathPatterns(
                "/api/v1/profiles/**",
                "/api/v1/notices/**",
                "/api/v1/community/**",
                "/api/v1/schedule/**",
                "/api/v1/courses/**",
                "/api/v1/dashboard/**",
                "/api/v1/schedules/**"
        );
    }
}
