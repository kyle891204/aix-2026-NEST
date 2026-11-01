package com.aix.team03.course;

import java.util.List;

/** 과목알림 제품 API 응답. LMS 원본 필드명(snake_case)은 integrations/lms에만 두고 여기서는 camelCase를 쓴다. */
public final class CourseModels {
    private CourseModels() {}

    public enum NotificationType { ANNOUNCEMENT, ASSIGNMENT, MATERIAL }

    public record CourseSummary(String courseId, String courseName, String courseCode, String termName) {}

    public record CourseList(List<CourseSummary> courses, boolean truncated) {}

    public record Notification(String id, NotificationType type, String title, String publishedAt,
            String dueAt, String lockAt, String materialType, String moduleName, String sourceUrl,
            String savedScheduleId) {}

    public record NotificationError(NotificationType type, String code) {}

    public record CourseNotifications(String courseId, List<Notification> notifications,
            List<NotificationError> errors) {}
}
