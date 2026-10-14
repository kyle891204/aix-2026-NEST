package com.aix.team03.integrations.lms;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.lms")
public class LmsProperties {
    private String apiBaseUrl = "https://learning.hanyang.ac.kr/api/v1";
    private String apiToken = "";

    public String getApiBaseUrl() { return apiBaseUrl; }
    public void setApiBaseUrl(String value) { apiBaseUrl = value; }
    public String getApiToken() { return apiToken; }
    public void setApiToken(String value) { apiToken = value; }
}
