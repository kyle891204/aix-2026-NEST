package com.aix.team03.integrations.lms;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.web.cors.CorsUtils;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Restricts the explicitly enabled shared-account demo; never exposes the Canvas token. */
@Configuration
@Profile("lms-demo")
public class LmsDemoAccessConfig implements WebMvcConfigurer {
    private final String password;

    public LmsDemoAccessConfig(@Value("${app.lms.demo-password:}") String password) {
        this.password = password;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new HandlerInterceptor() {
            @Override
            public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
                response.setHeader("Cache-Control", "no-store");
                if (CorsUtils.isPreFlightRequest(request)) return true;
                if (password.isBlank()) {
                    throw new LmsIntegrationException("LMS_DEMO_NOT_CONFIGURED",
                            "데모 접근 설정이 아직 완료되지 않았습니다.", HttpStatus.SERVICE_UNAVAILABLE, null);
                }
                String supplied = request.getHeader("X-LMS-Demo-Password");
                if (supplied == null || !MessageDigest.isEqual(password.getBytes(StandardCharsets.UTF_8),
                        supplied.getBytes(StandardCharsets.UTF_8))) {
                    throw new LmsIntegrationException("LMS_DEMO_UNAUTHORIZED",
                            "데모 접근 암호를 확인하세요.", HttpStatus.UNAUTHORIZED, null);
                }
                return true;
            }
        }).addPathPatterns("/api/v1/dev/lms", "/api/v1/dev/lms/**");
    }
}
