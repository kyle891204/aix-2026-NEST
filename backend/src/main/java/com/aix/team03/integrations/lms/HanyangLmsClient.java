package com.aix.team03.integrations.lms;

import java.net.URI;
import java.net.http.HttpClient;
import java.time.Duration;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.regex.Pattern;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.util.UriComponentsBuilder;
import static com.aix.team03.integrations.lms.LmsModels.*;

@Component
public class HanyangLmsClient {
    private static final int MAX_PAGES = 5;
    private static final Pattern NEXT = Pattern.compile("<([^>]+)>;\\s*rel=\"next\"");
    private final LmsProperties properties;
    private final RestClient client;

    public HanyangLmsClient(LmsProperties properties) {
        this.properties = properties;
        var http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10))
                .followRedirects(HttpClient.Redirect.NEVER).build();
        var factory = new JdkClientHttpRequestFactory(http);
        factory.setReadTimeout(Duration.ofSeconds(15));
        client = RestClient.builder().requestFactory(factory).build();
    }

    public Profile profile() {
        Profile result = get(uri("/users/self/profile"), new ParameterizedTypeReference<Profile>() {}).getBody();
        if (result.id() == null || result.name() == null) throw invalidResponse();
        return result;
    }

    public Page<Course> courses() {
        var uri = builder("/courses").queryParam("enrollment_state", "active")
                .queryParam("per_page", 50).build().encode().toUri();
        var result = pages(uri, new ParameterizedTypeReference<List<Course>>() {});
        for (Course course : result.items()) {
            if (course.id() == null || course.name() == null) throw invalidResponse();
        }
        return result;
    }

    public Page<Announcement> announcements(long courseId, LocalDate start, LocalDate end) {
        if (courseId <= 0 || start == null || end == null || end.isBefore(start)
                || ChronoUnit.DAYS.between(start, end) > 366) {
            throw new LmsIntegrationException("INVALID_LMS_QUERY", "과목 ID와 날짜 범위(최대 366일)를 확인하세요.", HttpStatus.BAD_REQUEST, null);
        }
        var uri = builder("/announcements").queryParam("context_codes[]", "course_" + courseId)
                .queryParam("start_date", start).queryParam("end_date", end.plusDays(1))
                .queryParam("active_only", true).queryParam("per_page", 50)
                .build().encode().toUri();
        return pages(uri, new ParameterizedTypeReference<List<Announcement>>() {});
    }

    private <T> Page<T> pages(URI initial, ParameterizedTypeReference<List<T>> type) {
        var items = new ArrayList<T>();
        var seen = new HashSet<URI>();
        URI next = initial;
        int count = 0;
        while (next != null && count < MAX_PAGES) {
            validateNext(initial, next);
            if (!seen.add(next)) throw unsafePagination();
            var response = get(next, type);
            items.addAll(response.getBody());
            count++;
            next = nextLink(response.getHeaders().get(HttpHeaders.LINK), next);
        }
        return new Page<>(List.copyOf(items), count, next != null);
    }

    private <T> ResponseEntity<T> get(URI uri, ParameterizedTypeReference<T> type) {
        String token = properties.getApiToken();
        if (token == null || token.isBlank()) {
            throw new LmsIntegrationException("LMS_NOT_CONFIGURED", "backend/.env에 LMS_API_TOKEN을 넣고 백엔드를 재시작하세요.", HttpStatus.SERVICE_UNAVAILABLE, null);
        }
        token = token.strip();
        if (token.chars().anyMatch(Character::isWhitespace)) {
            throw new LmsIntegrationException("LMS_INVALID_TOKEN_FORMAT", "토큰 값에 따옴표·공백·줄바꿈 없이 입력하세요.", HttpStatus.SERVICE_UNAVAILABLE, null);
        }
        try {
            var response = client.get().uri(uri).header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                    .header(HttpHeaders.ACCEPT, "application/json").retrieve()
                    .onStatus(status -> !status.is2xxSuccessful(), (request, result) -> {
                        throw statusError(result.getStatusCode().value());
                    }).toEntity(type);
            if (response.getBody() == null) throw invalidResponse();
            return response;
        } catch (LmsIntegrationException exception) {
            throw exception;
        } catch (ResourceAccessException exception) {
            throw new LmsIntegrationException("LMS_CONNECTION_FAILED", "LMS 연결·인증서·응답 시간을 확인하세요.", HttpStatus.GATEWAY_TIMEOUT, null);
        } catch (RestClientException exception) {
            throw invalidResponse();
        }
    }

    private UriComponentsBuilder builder(String path) {
        String base = properties.getApiBaseUrl().replaceAll("/+$", "");
        URI parsed;
        try { parsed = URI.create(base); } catch (IllegalArgumentException exception) { throw invalidBase(); }
        boolean local = "127.0.0.1".equals(parsed.getHost()) || "localhost".equals(parsed.getHost());
        if (parsed.getHost() == null || parsed.getUserInfo() != null || parsed.getQuery() != null
                || parsed.getFragment() != null || !("https".equals(parsed.getScheme())
                || (local && "http".equals(parsed.getScheme())))) throw invalidBase();
        return UriComponentsBuilder.fromUri(parsed).path(path);
    }

    private URI uri(String path) { return builder(path).build().encode().toUri(); }

    private URI nextLink(List<String> headers, URI current) {
        if (headers == null) return null;
        for (String header : headers) {
            var match = NEXT.matcher(header);
            if (match.find()) {
                try { return current.resolve(URI.create(match.group(1))); }
                catch (IllegalArgumentException exception) { throw unsafePagination(); }
            }
        }
        return null;
    }

    private void validateNext(URI initial, URI next) {
        if (!Objects.equals(initial.getScheme(), next.getScheme())
                || !Objects.equals(initial.getHost(), next.getHost()) || initial.getPort() != next.getPort()
                || !Objects.equals(initial.getPath(), next.getPath())
                || next.getUserInfo() != null || next.getFragment() != null) throw unsafePagination();
    }

    private LmsIntegrationException statusError(int status) {
        String code = "LMS_HTTP_ERROR";
        String message = "LMS 요청에 실패했습니다. 주소와 요청 범위를 확인하세요.";
        HttpStatus downstream = HttpStatus.BAD_GATEWAY;
        if (status == 401) { code = "LMS_TOKEN_REJECTED"; message = "LMS가 토큰을 거부했습니다. 발급 위치·만료·값을 확인하세요."; }
        else if (status == 403) { code = "LMS_PERMISSION_DENIED"; message = "해당 과목 공지를 읽을 권한이 없습니다."; }
        else if (status == 404) { code = "LMS_RESOURCE_NOT_FOUND"; message = "LMS 경로 또는 과목을 찾을 수 없습니다."; }
        else if (status == 429) { code = "LMS_RATE_LIMITED"; message = "LMS 요청 제한에 도달했습니다. 잠시 후 다시 시도하세요."; downstream = HttpStatus.SERVICE_UNAVAILABLE; }
        else if (status >= 300 && status < 400) { code = "LMS_REDIRECT_BLOCKED"; message = "LMS가 다른 주소로 이동을 요청했습니다. API 주소를 확인하세요."; }
        return new LmsIntegrationException(code, message, downstream, status);
    }

    private LmsIntegrationException unsafePagination() {
        return new LmsIntegrationException("LMS_UNSAFE_PAGINATION", "LMS 페이지 링크가 다른 주소 또는 반복 경로여서 중단했습니다.", HttpStatus.BAD_GATEWAY, null);
    }
    private LmsIntegrationException invalidResponse() {
        return new LmsIntegrationException("LMS_INVALID_RESPONSE", "LMS가 예상한 JSON 데이터를 반환하지 않았습니다.", HttpStatus.BAD_GATEWAY, null);
    }
    private LmsIntegrationException invalidBase() {
        return new LmsIntegrationException("LMS_INVALID_BASE_URL", "LMS_API_BASE_URL에 올바른 HTTPS API 주소를 입력하세요.", HttpStatus.SERVICE_UNAVAILABLE, null);
    }
}
