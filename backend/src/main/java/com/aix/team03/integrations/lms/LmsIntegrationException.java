package com.aix.team03.integrations.lms;

import org.springframework.http.HttpStatus;

public class LmsIntegrationException extends RuntimeException {
    private final String code;
    private final HttpStatus status;
    private final Integer upstreamStatus;

    public LmsIntegrationException(String code, String message, HttpStatus status, Integer upstreamStatus) {
        super(message);
        this.code = code;
        this.status = status;
        this.upstreamStatus = upstreamStatus;
    }

    public String getCode() { return code; }
    public HttpStatus getStatus() { return status; }
    public Integer getUpstreamStatus() { return upstreamStatus; }
}
