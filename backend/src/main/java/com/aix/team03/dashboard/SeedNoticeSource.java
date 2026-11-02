package com.aix.team03.dashboard;

import com.aix.team03.dashboard.DashboardModels.TargetedNotice;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

/** 공지 수집기(#8)가 준비되기 전까지 쓰는 예시 공지. 실제 학교 공지가 아니며 제목에 [예시]를 붙인다. */
@Component
public class SeedNoticeSource implements NoticeSource {
    private static final String RESOURCE = "seed/dashboard-notices.json";

    private final List<TargetedNotice> notices;

    public SeedNoticeSource(JsonMapper mapper) {
        try (InputStream input = new ClassPathResource(RESOURCE).getInputStream()) {
            notices = List.copyOf(mapper.readValue(input, new TypeReference<List<TargetedNotice>>() {}));
        } catch (IOException exception) {
            throw new IllegalStateException("예시 공지를 읽을 수 없습니다: " + RESOURCE, exception);
        }
    }

    @Override
    public List<TargetedNotice> notices() { return notices; }
}
