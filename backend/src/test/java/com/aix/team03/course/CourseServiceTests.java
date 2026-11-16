package com.aix.team03.course;

import com.aix.team03.integrations.lms.HanyangLmsClient;
import com.aix.team03.integrations.lms.LmsIntegrationException;
import com.aix.team03.integrations.lms.LmsProperties;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.EnumSet;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static com.aix.team03.course.CourseModels.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CourseServiceTests {
    private static final LocalDate START = LocalDate.of(2026, 8, 1);
    private static final LocalDate END = LocalDate.of(2026, 10, 31);
    // 마감 지남 여부의 기준 시각. 실제 날짜가 지나도 결과가 바뀌지 않게 고정한다.
    private static final Instant NOW = Instant.parse("2026-11-01T00:00:00Z");
    private static final EnumSet<NotificationType> ALL = EnumSet.allOf(NotificationType.class);

    private HttpServer server;
    private AtomicInteger requests;
    private CourseService service;

    @BeforeEach
    void startServer() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.start();
        requests = new AtomicInteger();
        var properties = new LmsProperties();
        properties.setApiBaseUrl("http://127.0.0.1:" + server.getAddress().getPort() + "/api/v1");
        properties.setApiToken("local-fixture-token");
        service = new CourseService(new HanyangLmsClient(properties), Clock.fixed(NOW, ZoneOffset.UTC));
    }

    @AfterEach
    void stopServer() { server.stop(0); }

    private void respond(HttpExchange exchange, int status, String json) throws IOException {
        requests.incrementAndGet();
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(status, bytes.length);
        exchange.getResponseBody().write(bytes);
        exchange.close();
    }

    private void fixture(String path, int status, String json) {
        server.createContext(path, exchange -> respond(exchange, status, json));
    }

    private void announcements() {
        fixture("/api/v1/announcements", 200, """
                [{"id":901,"title":"오래된 공지","posted_at":"2026-09-01T01:00:00Z","html_url":"https://lms.test/a/901"},
                 {"id":902,"title":"최신 공지","posted_at":"2026-10-29T01:00:00Z","html_url":"https://lms.test/a/902"}]""");
    }

    private void assignments() {
        fixture("/api/v1/courses/12/assignments", 200, """
                [{"id":21,"name":"마감 없음","course_id":12,"due_at":null},
                 {"id":22,"name":"9주차 과제","course_id":12,"due_at":"2026-11-03T14:59:00Z",
                  "lock_at":"2026-11-04T14:59:00Z","html_url":"https://lms.test/as/22"}]""");
    }

    private void materials() {
        fixture("/api/v1/courses/12/modules", 200, """
                [{"id":2,"name":"2주차","position":2},{"id":1,"name":"1주차","position":1}]""");
        fixture("/api/v1/courses/12/modules/1/items", 200, """
                [{"id":71,"title":"1주차 강의자료.pdf","type":"File","position":1,"html_url":"https://lms.test/i/71"},
                 {"id":72,"title":"1주차 퀴즈","type":"Quiz","position":2}]""");
        fixture("/api/v1/courses/12/modules/2/items", 200, """
                [{"id":81,"title":"참고 링크","type":"ExternalUrl","position":1},
                 {"id":82,"title":"2주차 과제","type":"Assignment","position":2}]""");
    }

    @Test
    void coursesUseCamelCaseIdsAsStrings() {
        fixture("/api/v1/courses", 200, "[{\"id\":12,\"name\":\"자료구조\",\"course_code\":\"CSE2010\"}]");
        var result = service.courses();
        assertThat(result.courses()).containsExactly(new CourseSummary("12", "자료구조", "CSE2010", null));
        assertThat(result.truncated()).isFalse();
    }

    @Test
    void allTypesAreCombinedAndOrderedWithinEachType() {
        announcements();
        assignments();
        materials();
        var result = service.notifications(12, ALL, START, END);

        assertThat(result.courseId()).isEqualTo("12");
        assertThat(result.errors()).isEmpty();
        assertThat(result.notifications()).extracting(Notification::id).containsExactly(
                "announcement-902", "announcement-901",
                "assignment-22", "assignment-21",
                "material-71", "material-81");
        var assignment = result.notifications().get(2);
        assertThat(assignment.title()).isEqualTo("9주차 과제");
        assertThat(assignment.dueAt()).isEqualTo("2026-11-03T14:59:00Z");
        assertThat(assignment.lockAt()).isEqualTo("2026-11-04T14:59:00Z");
        var material = result.notifications().get(4);
        assertThat(material.materialType()).isEqualTo("File");
        assertThat(material.moduleName()).isEqualTo("1주차");
    }

    @Test
    void announcementDeadlineComesFromItsBody() {
        fixture("/api/v1/announcements", 200, """
                [{"id":1,"title":"발표 자료 제출","message":"<p>11/6(금) 18:00까지 올려 주세요.</p>",
                  "posted_at":"2026-10-30T01:00:00Z","html_url":"https://lms.test/a/1"},
                 {"id":2,"title":"휴강 안내","message":"<p>11/4 수업은 휴강입니다.</p>",
                  "posted_at":"2026-10-29T01:00:00Z","html_url":"https://lms.test/a/2"}]""");
        var result = service.notifications(12, EnumSet.of(NotificationType.ANNOUNCEMENT), START, END);

        assertThat(result.notifications()).extracting(Notification::dueAt)
                .containsExactly("2026-11-06T18:00:00+09:00", null);
    }

    @Test
    void upcomingAssignmentsComeFirstThenRecentlyPastThenUndated() {
        fixture("/api/v1/courses/12/assignments", 200, """
                [{"id":1,"name":"두 달 전 마감","course_id":12,"due_at":"2026-09-01T14:59:00Z"},
                 {"id":2,"name":"마감일 없음","course_id":12,"due_at":null},
                 {"id":3,"name":"다음 주 마감","course_id":12,"due_at":"2026-11-08T14:59:00Z"},
                 {"id":4,"name":"어제 마감","course_id":12,"due_at":"2026-10-31T14:59:00Z"},
                 {"id":5,"name":"내일 마감","course_id":12,"due_at":"2026-11-02T00:00:00+09:00"}]""");
        var result = service.notifications(12, EnumSet.of(NotificationType.ASSIGNMENT), START, END);

        // 마감 전(임박순) → 마감 지남(최근 마감순) → 마감일 없음. 지난 과제도 목록에 남는다.
        assertThat(result.notifications()).extracting(Notification::id).containsExactly(
                "assignment-5", "assignment-3", "assignment-4", "assignment-1", "assignment-2");
        // 오프셋이 붙은 원본 문자열은 바꾸지 않고 그대로 돌려준다.
        assertThat(result.notifications().getFirst().dueAt()).isEqualTo("2026-11-02T00:00:00+09:00");
    }

    @Test
    void onlyTheRequestedTypeIsFetched() {
        assignments();
        var result = service.notifications(12, EnumSet.of(NotificationType.ASSIGNMENT), START, END);
        assertThat(result.notifications()).allMatch(item -> item.type() == NotificationType.ASSIGNMENT);
        assertThat(requests.get()).isEqualTo(1);
    }

    @Test
    void oneFailedTypeIsReportedWhileOthersAreReturned() {
        announcements();
        assignments();
        fixture("/api/v1/courses/12/modules", 403, "{}");
        var result = service.notifications(12, ALL, START, END);

        assertThat(result.notifications()).extracting(Notification::type)
                .containsOnly(NotificationType.ANNOUNCEMENT, NotificationType.ASSIGNMENT);
        assertThat(result.errors()).containsExactly(
                new NotificationError(NotificationType.MATERIAL, "LMS_PERMISSION_DENIED"));
    }

    @Test
    void oneFailedModuleKeepsMaterialsAlreadyRead() {
        fixture("/api/v1/courses/12/modules", 200, """
                [{"id":1,"name":"1주차","position":1},{"id":2,"name":"2주차","position":2}]""");
        fixture("/api/v1/courses/12/modules/1/items", 200, """
                [{"id":71,"title":"1주차 강의자료.pdf","type":"File","position":1}]""");
        fixture("/api/v1/courses/12/modules/2/items", 500, "{}");
        var result = service.notifications(12, EnumSet.of(NotificationType.MATERIAL), START, END);

        assertThat(result.notifications()).extracting(Notification::id).containsExactly("material-71");
        assertThat(result.errors()).containsExactly(new NotificationError(NotificationType.MATERIAL, "LMS_HTTP_ERROR"));
    }

    @Test
    void announcementsAreOrderedByActualTimeAcrossOffsets() {
        // 글자 순서로는 +09:00 값이 앞서지만 실제 시각은 Z 값이 1시간 더 늦다.
        fixture("/api/v1/announcements", 200, """
                [{"id":1,"title":"한국 시간 공지","posted_at":"2026-10-29T10:00:00+09:00"},
                 {"id":2,"title":"UTC 공지","posted_at":"2026-10-29T02:00:00Z"},
                 {"id":3,"title":"게시일 없음","posted_at":null}]""");
        var result = service.notifications(12, EnumSet.of(NotificationType.ANNOUNCEMENT), START, END);
        assertThat(result.notifications()).extracting(Notification::id)
                .containsExactly("announcement-2", "announcement-1", "announcement-3");
    }

    @Test
    void truncatedIsReportedWhenAnLmsListHitsThePageLimit() {
        // 항상 다음 페이지 링크를 주면 LMS 클라이언트가 페이지 상한에서 멈추고 truncated를 표시한다.
        server.createContext("/api/v1/courses/12/assignments", exchange -> {
            String query = exchange.getRequestURI().getQuery();
            int page = query != null && query.contains("page=") ? Integer.parseInt(query.replaceAll(".*page=(\\d+).*", "$1")) : 1;
            exchange.getResponseHeaders().set("Link", "<http://127.0.0.1:" + server.getAddress().getPort()
                    + "/api/v1/courses/12/assignments?page=" + (page + 1) + ">; rel=\"next\"");
            respond(exchange, 200, "[{\"id\":" + page + ",\"name\":\"과제 " + page + "\",\"course_id\":12}]");
        });
        var result = service.notifications(12, EnumSet.of(NotificationType.ASSIGNMENT), START, END);
        assertThat(result.truncated()).isTrue();

        announcements();
        assertThat(service.notifications(12, EnumSet.of(NotificationType.ANNOUNCEMENT), START, END).truncated()).isFalse();
    }

    @Test
    void whenEveryRequestedTypeFailsTheLmsErrorIsThrown() {
        fixture("/api/v1/announcements", 401, "{}");
        fixture("/api/v1/courses/12/assignments", 401, "{}");
        fixture("/api/v1/courses/12/modules", 401, "{}");
        assertThatThrownBy(() -> service.notifications(12, ALL, START, END))
                .isInstanceOf(LmsIntegrationException.class)
                .extracting("code").isEqualTo("LMS_TOKEN_REJECTED");
    }

    @Test
    void announcementBodyAndAssignmentDescriptionBecomePlainText() {
        fixture("/api/v1/announcements", 200, """
                [{"id":1,"title":"중간 발표","message":"<p>팀별 발표를&nbsp;준비하세요.</p><p>자료는<br>LMS에 올려 주세요.</p><script>alert(1)</script>",
                  "posted_at":"2026-10-30T01:00:00Z"}]""");
        fixture("/api/v1/courses/12/assignments", 200, """
                [{"id":22,"name":"제안서","course_id":12,"description":"<ul><li>문제</li><li>사용자</li></ul>"},
                 {"id":23,"name":"이미지만","course_id":12,"description":"<p><img src='x.png'></p>"}]""");
        var result = service.notifications(12, EnumSet.of(NotificationType.ANNOUNCEMENT, NotificationType.ASSIGNMENT),
                START, END);

        assertThat(result.notifications()).extracting(Notification::content).containsExactly(
                "팀별 발표를 준비하세요.\n자료는\nLMS에 올려 주세요.", "문제\n사용자", null);
        assertThat(result.errors()).isEmpty();
        assertThat(result.notifications()).extracting(Notification::courseId).containsOnly("12");
    }

    // 전체 과목 화면용: 공지는 context_codes로 과목을 구분해 응답한다.
    private void overviewFixtures(int failingAssignmentsStatus) {
        fixture("/api/v1/courses", 200, """
                [{"id":12,"name":"자료구조","course_code":"CSE2010"},{"id":13,"name":"데이터베이스","course_code":"CSE3010"}]""");
        server.createContext("/api/v1/announcements", exchange -> respond(exchange, 200,
                exchange.getRequestURI().getQuery().contains("course_12") ? """
                        [{"id":1,"title":"발표 자료 제출","message":"<p>11/6(금) 18:00까지 올려 주세요.</p>",
                          "posted_at":"2026-10-28T01:00:00Z"},
                         {"id":2,"title":"휴강 안내","posted_at":"2026-10-29T01:00:00Z"}]""" : """
                        [{"id":3,"title":"교재 안내","posted_at":"2026-10-30T01:00:00Z"},
                         {"id":4,"title":"보고서 제출","message":"<p>보고서는 10/25까지 제출하세요.</p>",
                          "posted_at":"2026-10-15T01:00:00Z"}]"""));
        fixture("/api/v1/courses/12/assignments", 200, """
                [{"id":20,"name":"기간 전 과제","course_id":12,"due_at":"2026-07-20T14:59:00Z"},
                 {"id":21,"name":"지난 과제","course_id":12,"due_at":"2026-10-20T14:59:00Z"},
                 {"id":22,"name":"9주차 과제","course_id":12,"due_at":"2026-11-03T14:59:00Z"}]""");
        fixture("/api/v1/courses/13/assignments", failingAssignmentsStatus, """
                [{"id":31,"name":"ERD 제출","course_id":13,"due_at":"2026-11-02T14:59:00Z"},
                 {"id":32,"name":"마감 없는 과제","course_id":13,"due_at":null}]""");
    }

    @Test
    void overviewKeepsOngoingItemsOfEveryCourseByDeadlineThenPostingDate() {
        overviewFixtures(200);
        var result = service.overview(START, END);

        assertThat(result.courses()).extracting(CourseSummary::courseId).containsExactly("12", "13");
        assertThat(result.errors()).isEmpty();
        // 마감 전 항목이 마감 임박순으로 먼저, 마감 없는 공지는 최근 게시순, 마감 지난 공지·과제는 최근 마감순으로 맨 뒤.
        // 마감 없는 과제와 조회 기간보다 먼저 마감된 과제, 학습자료는 빠진다.
        assertThat(result.notifications()).extracting(item -> item.courseId() + ":" + item.id()).containsExactly(
                "13:assignment-31", "12:assignment-22", "12:announcement-1", "13:announcement-3", "12:announcement-2",
                "13:announcement-4", "12:assignment-21");
    }

    @Test
    void overviewShowsOtherCoursesWhenOneCourseFails() {
        overviewFixtures(500);
        var result = service.overview(START, END);

        assertThat(result.errors()).containsExactly(new CourseError("13", NotificationType.ASSIGNMENT, "LMS_HTTP_ERROR"));
        assertThat(result.notifications()).extracting(Notification::id)
                .contains("assignment-22", "announcement-3").doesNotContain("assignment-31");
    }

    @Test
    void overviewThrowsTheLmsErrorWhenEveryCourseFails() {
        fixture("/api/v1/courses", 200, "[{\"id\":12,\"name\":\"자료구조\"}]");
        fixture("/api/v1/announcements", 401, "{}");
        fixture("/api/v1/courses/12/assignments", 401, "{}");
        assertThatThrownBy(() -> service.overview(START, END))
                .isInstanceOf(LmsIntegrationException.class)
                .extracting("code").isEqualTo("LMS_TOKEN_REJECTED");
    }

    @Test
    void invalidInputIsRejectedBeforeContactingLms() {
        assertThatThrownBy(() -> service.notifications(0, ALL, START, END))
                .extracting("code").isEqualTo("INVALID_LMS_QUERY");
        assertThatThrownBy(() -> service.notifications(12, ALL, END, START))
                .extracting("code").isEqualTo("INVALID_LMS_QUERY");
        assertThatThrownBy(() -> service.notifications(12, ALL, START, START.plusDays(367)))
                .extracting("code").isEqualTo("INVALID_LMS_QUERY");
        assertThat(requests.get()).isZero();
    }
}
