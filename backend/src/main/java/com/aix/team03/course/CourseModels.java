package com.aix.team03.course;

import java.util.List;

/** 과목알림 제품 API 응답. LMS 원본 필드명(snake_case)은 integrations/lms에만 두고 여기서는 camelCase를 쓴다. */
public final class CourseModels {
    private CourseModels() {}

    public enum NotificationType { ANNOUNCEMENT, ASSIGNMENT, MATERIAL }

    public record CourseSummary(String courseId, String courseName, String courseCode, String termName) {}

    public record CourseList(List<CourseSummary> courses, boolean truncated) {}

    /** content는 공지 본문·과제 설명을 줄바꿈만 살린 글로 바꾼 값이다(S09 상세). 학습자료는 null이다. */
    public record Notification(String courseId, String id, NotificationType type, String title, String publishedAt,
            String dueAt, String lockAt, String materialType, String moduleName, String sourceUrl,
            String savedScheduleId, String content) {}

    public record NotificationError(NotificationType type, String code) {}

    /** truncated는 LMS 페이지 상한에 걸려 일부 목록만 가져왔을 때 true다. */
    public record CourseNotifications(String courseId, List<Notification> notifications,
            List<NotificationError> errors, boolean truncated) {}

    public record CourseError(String courseId, NotificationType type, String code) {}

    /**
     * S08 전체 과목 화면. 모든 과목의 공지와 마감 있는 과제(마감 지난 것은 조회 기간 안)를 모은다.
     * 학습자료와 마감 없는 과제는 과목별 화면(S09)에서 본다.
     * 한 과목이 실패해도 나머지는 보여주고, 실패한 과목과 유형은 errors로 알린다.
     */
    public record CourseOverview(List<CourseSummary> courses, List<Notification> notifications,
            List<CourseError> errors, boolean truncated) {}
}
