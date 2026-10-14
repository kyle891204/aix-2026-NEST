package com.aix.team03.integrations.lms;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
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
}
