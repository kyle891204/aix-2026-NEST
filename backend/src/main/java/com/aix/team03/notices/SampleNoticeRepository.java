package com.aix.team03.notices;

import com.aix.team03.notices.NoticeModels.Notice;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;
import java.util.Optional;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Repository;
import tools.jackson.databind.json.JsonMapper;

/** 수집을 끈 경우(테스트, 오프라인 개발)에만 쓰는 샘플 공지다. 모든 항목은 sample: true로 응답한다. */
@Repository
public class SampleNoticeRepository implements NoticeRepository {
    private final List<Notice> notices;

    public SampleNoticeRepository(JsonMapper mapper) {
        try (var input = new ClassPathResource("notices/sample-notices.json").getInputStream()) {
            notices = List.of(mapper.readValue(input, Notice[].class));
        } catch (IOException exception) {
            throw new UncheckedIOException(exception);
        }
    }

    @Override
    public List<Notice> findAll() { return notices; }

    @Override
    public Optional<Notice> findById(String noticeId) {
        return notices.stream().filter(notice -> notice.noticeId().equals(noticeId)).findFirst();
    }
}
