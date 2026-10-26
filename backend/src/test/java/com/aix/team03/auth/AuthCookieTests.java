package com.aix.team03.auth;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.beans.factory.annotation.Value;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "spring.config.import=", "app.auth.google-client-id=", "app.lms.api-token=",
        "server.servlet.session.cookie.secure=true"
})
class AuthCookieTests {
    @Value("${local.server.port}") int port;

    @Test
    void productionSessionUsesSecureHostOnlyHttpOnlyCookieAndNoCache() throws Exception {
        try (var client = HttpClient.newHttpClient()) {
            var response = client.send(HttpRequest.newBuilder(
                    URI.create("http://127.0.0.1:" + port + "/api/v1/auth/session")).GET().build(),
                    HttpResponse.BodyHandlers.ofString());
            assertThat(response.statusCode()).isEqualTo(200);
            assertThat(response.headers().firstValue("Cache-Control")).contains("no-store");
            assertThat(response.headers().firstValue("Set-Cookie").orElseThrow())
                    .contains("NEST_SESSION=", "HttpOnly", "Secure", "SameSite=Lax", "Path=/api")
                    .doesNotContain("Domain=");
        }
    }
}
