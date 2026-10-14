package com.aix.team03.integrations.lms;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public final class LmsModels {
    private LmsModels() {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Profile(Long id, String name, String locale) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Course(Long id, String name,
            @JsonProperty("course_code") String courseCode) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Announcement(Long id, String title, String message,
            @JsonProperty("posted_at") String postedAt,
            @JsonProperty("html_url") String htmlUrl,
            @JsonProperty("context_code") String contextCode) {}

    public record Page<T>(List<T> items, int pagesFetched, boolean truncated) {}
}
