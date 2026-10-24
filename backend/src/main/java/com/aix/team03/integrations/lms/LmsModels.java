package com.aix.team03.integrations.lms;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import java.math.BigDecimal;

public final class LmsModels {
    private LmsModels() {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Profile(Long id, String name, String locale) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Course(Long id, String name,
            @JsonProperty("course_code") String courseCode) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record CourseDetail(Long id, String name,
            @JsonProperty("course_code") String courseCode,
            @JsonProperty("syllabus_body") String syllabusBody,
            @JsonProperty("public_description") String publicDescription,
            @JsonProperty("time_zone") String timeZone,
            @JsonProperty("workflow_state") String workflowState) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Assignment(Long id, String name, String description,
            @JsonProperty("course_id") Long courseId,
            @JsonProperty("due_at") String dueAt,
            @JsonProperty("unlock_at") String unlockAt,
            @JsonProperty("lock_at") String lockAt,
            @JsonProperty("html_url") String htmlUrl,
            @JsonProperty("submission_types") List<String> submissionTypes,
            @JsonProperty("points_possible") BigDecimal pointsPossible,
            @JsonProperty("locked_for_user") Boolean lockedForUser) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record CourseModule(Long id, String name, Integer position,
            @JsonProperty("items_count") Integer itemsCount, String state) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ModuleItem(Long id, String title, String type, Integer position,
            @JsonProperty("html_url") String htmlUrl,
            @JsonProperty("content_id") Long contentId,
            @JsonProperty("content_details") ContentDetails contentDetails) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ContentDetails(
            @JsonProperty("due_at") String dueAt,
            @JsonProperty("unlock_at") String unlockAt,
            @JsonProperty("lock_at") String lockAt,
            @JsonProperty("locked_for_user") Boolean lockedForUser) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Announcement(Long id, String title, String message,
            @JsonProperty("posted_at") String postedAt,
            @JsonProperty("html_url") String htmlUrl,
            @JsonProperty("context_code") String contextCode) {}

    public record Page<T>(List<T> items, int pagesFetched, boolean truncated) {}
}
