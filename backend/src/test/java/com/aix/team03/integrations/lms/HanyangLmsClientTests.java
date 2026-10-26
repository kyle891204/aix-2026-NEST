package com.aix.team03.integrations.lms;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class HanyangLmsClientTests {
    private HttpServer server;
    private LmsProperties properties;
    private AtomicInteger requests;

    @BeforeEach
    void startServer() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.start();
        requests = new AtomicInteger();
        properties = new LmsProperties();
        properties.setApiBaseUrl(base() + "/api/v1");
        properties.setApiToken("local-fixture-token");
    }

    @AfterEach
    void stopServer() { server.stop(0); }

    private String base() { return "http://127.0.0.1:" + server.getAddress().getPort(); }
    private HanyangLmsClient client() { return new HanyangLmsClient(properties); }

    private void respond(HttpExchange exchange, int status, String json) throws IOException {
        requests.incrementAndGet();
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(status, bytes.length);
        exchange.getResponseBody().write(bytes);
        exchange.close();
    }

    @Test
    void missingTokenDoesNotContactLms() {
        properties.setApiToken("");
        assertThatThrownBy(() -> client().profile()).isInstanceOf(LmsIntegrationException.class)
                .hasMessageContaining("LMS_API_TOKEN");
        assertThat(requests.get()).isZero();
    }

    @Test
    void profileUsesBearerAndIgnoresExtraFields() {
        server.createContext("/api/v1/users/self/profile", exchange -> {
            assertThat(exchange.getRequestHeaders().getFirst("Authorization")).isEqualTo("Bearer local-fixture-token");
            respond(exchange, 200, "{\"id\":7,\"name\":\"Test Student\",\"locale\":\"en\",\"email\":\"private@example.test\"}");
        });
        assertThat(client().profile().id()).isEqualTo(7L);
    }

    @Test
    void coursesFollowSameOriginNextPage() {
        server.createContext("/api/v1/courses", exchange -> {
            boolean next = exchange.getRequestURI().getQuery().contains("page=2");
            if (!next) exchange.getResponseHeaders().set("Link", "<" + base() + "/api/v1/courses?page=2>; rel=\"next\"");
            respond(exchange, 200, next ? "[{\"id\":2,\"name\":\"B\"}]" : "[{\"id\":1,\"name\":\"A\",\"course_code\":\"CODE\"}]");
        });
        var result = client().courses();
        assertThat(result.items()).hasSize(2);
        assertThat(result.items().getFirst().courseCode()).isEqualTo("CODE");
        assertThat(result.pagesFetched()).isEqualTo(2);
        assertThat(result.truncated()).isFalse();
    }

    @Test
    void externalPaginationIsBlockedBeforeForwardingToken() {
        server.createContext("/api/v1/courses", exchange -> {
            exchange.getResponseHeaders().set("Link", "<https://example.invalid/api/v1/courses?page=2>; rel=\"next\"");
            respond(exchange, 200, "[]");
        });
        assertThatThrownBy(() -> client().courses()).isInstanceOf(LmsIntegrationException.class)
                .hasMessageContaining("페이지 링크");
        assertThat(requests.get()).isEqualTo(1);
    }

    @Test
    void redirectsAreNotFollowed() {
        server.createContext("/api/v1/users/self/profile", exchange -> {
            exchange.getResponseHeaders().set("Location", "/redirect-target");
            respond(exchange, 302, "{}");
        });
        server.createContext("/redirect-target", exchange -> respond(exchange, 200, "{}"));
        assertThatThrownBy(() -> client().profile()).isInstanceOf(LmsIntegrationException.class)
                .hasMessageContaining("다른 주소");
        assertThat(requests.get()).isEqualTo(1);
    }

    @Test
    void invalidTokenHasSafeErrorWithoutUpstreamBody() {
        server.createContext("/api/v1/users/self/profile", exchange -> respond(exchange, 401, "{\"secret\":\"private-debug-info\"}"));
        assertThatThrownBy(() -> client().profile()).isInstanceOfSatisfying(LmsIntegrationException.class, error -> {
            assertThat(error.getCode()).isEqualTo("LMS_TOKEN_REJECTED");
            assertThat(error.getUpstreamStatus()).isEqualTo(401);
            assertThat(error.getMessage()).doesNotContain("private-debug-info", "local-fixture-token");
        });
    }

    @Test
    void noticesUseCourseAndExplicitDateRange() {
        server.createContext("/api/v1/announcements", exchange -> {
            String query = exchange.getRequestURI().getQuery();
            assertThat(query).contains("context_codes[]=course_42", "start_date=2026-10-01", "end_date=2026-10-15");
            respond(exchange, 200, "[{\"id\":9,\"title\":\"Notice\",\"message\":\"<p>Original</p>\",\"posted_at\":\"2026-10-10T00:00:00Z\"}]");
        });
        var result = client().announcements(42, LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 14));
        assertThat(result.items().getFirst().message()).isEqualTo("<p>Original</p>");
    }

    @Test
    void invalidDateRangeStopsBeforeNetwork() {
        assertThatThrownBy(() -> client().announcements(42, LocalDate.of(2026, 10, 14), LocalDate.of(2026, 10, 1)))
                .isInstanceOf(LmsIntegrationException.class);
        assertThat(requests.get()).isZero();
    }

    @Test
    void paginationCapReturnsPartialResultFlag() {
        server.createContext("/api/v1/courses", exchange -> {
            exchange.getResponseHeaders().set("Link", "<" + base() + "/api/v1/courses?page=" + (requests.get() + 2) + ">; rel=\"next\"");
            respond(exchange, 200, "[]");
        });
        var result = client().courses();
        assertThat(requests.get()).isEqualTo(5);
        assertThat(result.truncated()).isTrue();
    }

    @Test
    void courseDetailsRequestSyllabusAndKeepMissingFieldsUnknown() {
        server.createContext("/api/v1/courses/42", exchange -> {
            assertThat(exchange.getRequestURI().getQuery()).contains("include[]=syllabus_body");
            respond(exchange, 200, """
                    {"id":42,"name":"AIX","course_code":"AIX-2026",
                     "syllabus_body":"<p>Project course</p>","time_zone":"Asia/Seoul"}
                    """);
        });
        var result = client().course(42);
        assertThat(result.syllabusBody()).isEqualTo("<p>Project course</p>");
        assertThat(result.publicDescription()).isNull();
        assertThat(result.timeZone()).isEqualTo("Asia/Seoul");
    }

    @Test
    void assignmentsKeepDueAndLockDatesSeparateAndFollowPagination() {
        server.createContext("/api/v1/courses/42/assignments", exchange -> {
            String query = exchange.getRequestURI().getQuery();
            if (query.contains("page=2")) {
                respond(exchange, 200, "[{\"id\":2,\"name\":\"No API deadline\",\"course_id\":42,\"due_at\":null}]");
            } else {
                assertThat(query).contains("override_assignment_dates=true", "order_by=due_at", "per_page=50");
                exchange.getResponseHeaders().set("Link", "<" + base() + "/api/v1/courses/42/assignments?page=2>; rel=\"next\"");
                respond(exchange, 200, """
                        [{"id":1,"name":"Report","course_id":42,"description":"<p>Upload PDF</p>",
                          "due_at":"2026-10-25T14:59:00Z","lock_at":"2026-10-26T14:59:00Z",
                          "submission_types":["online_upload"],"points_possible":12.5,"locked_for_user":false}]
                        """);
            }
        });
        var result = client().assignments(42);
        assertThat(result.pagesFetched()).isEqualTo(2);
        assertThat(result.items()).hasSize(2);
        assertThat(result.items().getFirst().dueAt()).isEqualTo("2026-10-25T14:59:00Z");
        assertThat(result.items().getFirst().lockAt()).isEqualTo("2026-10-26T14:59:00Z");
        assertThat(result.items().getFirst().pointsPossible()).isEqualByComparingTo("12.5");
        assertThat(result.items().get(1).dueAt()).isNull();
    }

    @Test
    void modulesAndTheirItemsUseSeparatePaginatedEndpoints() {
        server.createContext("/api/v1/courses/42/modules", exchange -> {
            if (exchange.getRequestURI().getPath().endsWith("/items")) {
                assertThat(exchange.getRequestURI().getQuery()).contains("include[]=content_details");
                respond(exchange, 200, """
                        [{"id":10,"title":"Week 7 task","type":"Assignment","content_id":1,
                          "content_details":{"due_at":"2026-10-25T14:59:00Z","locked_for_user":false}}]
                        """);
            } else {
                respond(exchange, 200, "[{\"id\":8,\"name\":\"Week 7\",\"position\":1,\"items_count\":1,\"state\":\"unlocked\"}]");
            }
        });
        assertThat(client().modules(42).items().getFirst().itemsCount()).isEqualTo(1);
        var item = client().moduleItems(42, 8).items().getFirst();
        assertThat(item.type()).isEqualTo("Assignment");
        assertThat(item.contentDetails().dueAt()).isEqualTo("2026-10-25T14:59:00Z");
    }

    @Test
    void invalidResourceIdsStopBeforeNetwork() {
        assertThatThrownBy(() -> client().course(0)).isInstanceOf(LmsIntegrationException.class);
        assertThatThrownBy(() -> client().assignments(-1)).isInstanceOf(LmsIntegrationException.class);
        assertThatThrownBy(() -> client().modules(0)).isInstanceOf(LmsIntegrationException.class);
        assertThatThrownBy(() -> client().moduleItems(42, -8)).isInstanceOf(LmsIntegrationException.class);
        assertThat(requests.get()).isZero();
    }

    @Test
    void unexpectedCourseAndAssignmentShapesAreRejected() {
        server.createContext("/api/v1/courses/42", exchange -> {
            if (exchange.getRequestURI().getPath().endsWith("assignments")) {
                respond(exchange, 200, "[{\"id\":1,\"name\":\"Other course\",\"course_id\":99}]");
            } else {
                respond(exchange, 200, "{\"id\":99,\"name\":\"Other course\"}");
            }
        });
        assertThatThrownBy(() -> client().course(42)).isInstanceOfSatisfying(LmsIntegrationException.class,
                error -> assertThat(error.getCode()).isEqualTo("LMS_INVALID_RESPONSE"));
        assertThatThrownBy(() -> client().assignments(42)).isInstanceOfSatisfying(LmsIntegrationException.class,
                error -> assertThat(error.getCode()).isEqualTo("LMS_INVALID_RESPONSE"));
    }

    @Test
    void nullListEntryIsAnInvalidResponseInsteadOfAnInternalError() {
        server.createContext("/api/v1/courses/42/assignments", exchange -> respond(exchange, 200, "[null]"));
        assertThatThrownBy(() -> client().assignments(42)).isInstanceOfSatisfying(LmsIntegrationException.class,
                error -> assertThat(error.getCode()).isEqualTo("LMS_INVALID_RESPONSE"));
    }

    @Test
    void deniedAndRateLimitedResourcesRemainErrorsRatherThanEmptyLists() {
        server.createContext("/api/v1/courses/42/assignments", exchange -> respond(exchange, 403, "{}"));
        server.createContext("/api/v1/courses/42/modules", exchange -> respond(exchange, 429, "{}"));
        assertThatThrownBy(() -> client().assignments(42)).isInstanceOfSatisfying(LmsIntegrationException.class,
                error -> assertThat(error.getCode()).isEqualTo("LMS_PERMISSION_DENIED"));
        assertThatThrownBy(() -> client().modules(42)).isInstanceOfSatisfying(LmsIntegrationException.class,
                error -> assertThat(error.getCode()).isEqualTo("LMS_RATE_LIMITED"));
    }

    @Test
    void developmentRoutesReturnCourseAssignmentsAndModuleItems() throws Exception {
        server.createContext("/api/v1/courses/42", exchange -> {
            String path = exchange.getRequestURI().getPath();
            if (path.endsWith("assignments")) respond(exchange, 200, "[{\"id\":1,\"name\":\"Task\",\"course_id\":42,\"due_at\":null}]");
            else if (path.endsWith("items")) respond(exchange, 200, "[{\"id\":10,\"title\":\"Read\",\"type\":\"Page\"}]");
            else if (path.endsWith("modules")) respond(exchange, 200, "[{\"id\":8,\"name\":\"Week 7\"}]");
            else respond(exchange, 200, "{\"id\":42,\"name\":\"AIX\",\"syllabus_body\":\"<p>Course</p>\"}");
        });
        var mvc = org.springframework.test.web.servlet.setup.MockMvcBuilders
                .standaloneSetup(new LmsDevController(client())).build();
        for (String suffix : List.of("/42", "/42/assignments", "/42/modules", "/42/modules/8/items")) {
            mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/v1/dev/lms/courses" + suffix))
                    .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk());
        }
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/v1/dev/lms/courses/42/assignments"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.items[0].due_at").doesNotExist())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.items[0].course_id").value(42));
    }
}
