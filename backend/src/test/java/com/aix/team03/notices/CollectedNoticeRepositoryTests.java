package com.aix.team03.notices;

import com.aix.team03.integrations.school.SchoolNoticeCollector;
import com.aix.team03.integrations.school.SchoolNoticeModels.Attachment;
import com.aix.team03.integrations.school.SchoolNoticeModels.BoardKind;
import com.aix.team03.integrations.school.SchoolNoticeModels.SchoolNotice;
import com.aix.team03.matching.MatchingModels.AnalysisStatus;
import com.aix.team03.matching.MatchingModels.MatchStatus;
import com.aix.team03.matching.MatchingModels.StudentProfile;
import com.aix.team03.matching.NoticeMatcher;
import com.aix.team03.notices.NoticeModels.Category;
import com.aix.team03.notices.NoticeModels.Notice;
import com.aix.team03.notices.NoticeModels.Source;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

/**
 * 자동 테스트용: 수집한 공지를 어떻게 정리하고 언제 다시 수집하는지 검사한다. 실제 앱은 학교 사이트에서
 * 수집하지만, 여기서는 수집 결과를 직접 넣어 사이트 상태와 상관없이 검사한다.
 */
class CollectedNoticeRepositoryTests {
    private final SampleNoticeRepository samples = mock(SampleNoticeRepository.class);
    private final SchoolNoticeCollector collector = mock(SchoolNoticeCollector.class);

    private static SchoolNotice school(String id, String label, String title, LocalDate postedAt, String content) {
        return new SchoolNotice("erica-pharmacy", BoardKind.COLLEGE, "약학대학", "pharmacy", id, label, title, postedAt,
                "https://pharmacy.hanyang.ac.kr/front/information/notice/notice-view?id=" + id, content,
                List.of(new Attachment("안내.pdf", "https://pharmacy.hanyang.ac.kr/file")));
    }

    private CollectedNoticeRepository repository(Clock clock, List<Runnable> background) {
        return new CollectedNoticeRepository(samples, collector, true, background::add, clock);
    }

    @Test
    void firstReadWaitsForRealNoticesAndNeverShowsSamples() {
        when(collector.collect()).thenReturn(List.of(
                school("1", "일반", "오래된 공지", LocalDate.of(2026, 9, 1), "본문"),
                school("2", "대학원", "모집요강 공고", LocalDate.of(2026, 10, 1), "본문")));

        var notices = repository(new MutableClock(), new ArrayList<>()).findAll();

        assertThat(notices).extracting(Notice::noticeId).containsExactly("erica-pharmacy-2", "erica-pharmacy-1");
        assertThat(notices).allSatisfy(notice -> assertThat(notice.sample()).isFalse());
        verifyNoInteractions(samples);
    }

    @Test
    void mapsBoardNoticeToProductNotice() {
        var notice = CollectedNotices.toNotice(school("2", "대학원", "모집요강 공고", LocalDate.of(2026, 10, 1), "본문"));

        assertThat(notice.noticeId()).isEqualTo("erica-pharmacy-2");
        assertThat(notice.source()).isEqualTo(Source.COLLEGE);
        assertThat(notice.sourceName()).isEqualTo("약학대학");
        assertThat(notice.collegeId()).isEqualTo("pharmacy");
        assertThat(notice.title()).isEqualTo("[대학원] 모집요강 공고");
        assertThat(notice.postedAt()).isEqualTo("2026-10-01");
        assertThat(notice.sourceUrl()).endsWith("id=2");
        assertThat(notice.attachments()).singleElement().satisfies(file -> assertThat(file.name()).isEqualTo("안내.pdf"));
        assertThat(notice.originalLanguage()).isEqualTo("ko");
        assertThat(notice.sample()).isFalse();
    }

    @Test
    void graduateLabelTargetsGraduateStudents() {
        var matcher = new NoticeMatcher();
        var graduate = CollectedNotices.toNotice(school("2", "대학원", "모집요강 공고", null, "본문"));
        var general = CollectedNotices.toNotice(school("3", "일반", "안전교육 안내", null, "본문"));

        assertThat(graduate.analysisStatus()).isEqualTo(AnalysisStatus.CONFIRMED);
        assertThat(graduate.targetConditions().degrees()).containsExactly("MASTER", "DOCTORAL");
        assertThat(match(matcher, graduate, "MASTER")).isEqualTo(MatchStatus.APPLICABLE);
        assertThat(match(matcher, graduate, "DOCTORAL")).isEqualTo(MatchStatus.APPLICABLE);
        assertThat(match(matcher, graduate, "BACHELOR")).isEqualTo(MatchStatus.NOT_APPLICABLE);
        assertThat(match(matcher, graduate, null)).isEqualTo(MatchStatus.NEEDS_REVIEW);
        assertThat(general.analysisStatus()).isEqualTo(AnalysisStatus.NOT_ANALYZED);
        assertThat(match(matcher, general, "MASTER")).isEqualTo(MatchStatus.NEEDS_REVIEW);
    }

    @Test
    void academicAffairsLabelIsNotABachelorCondition() {
        var notice = CollectedNotices.toNotice(school("4", "학사", "계절학기 수강신청 안내", null, "본문"));

        assertThat(notice.targetConditions()).isNull();
        assertThat(notice.analysisStatus()).isEqualTo(AnalysisStatus.NOT_ANALYZED);
        assertThat(notice.category()).isEqualTo(Category.ACADEMIC);
    }

    @Test
    void classifiesByBoardLabelThenTitle() {
        assertThat(CollectedNotices.category("장학", "신청 안내")).isEqualTo(Category.SCHOLARSHIP);
        assertThat(CollectedNotices.category("", "외국인 유학생 체류기간 연장 안내")).isEqualTo(Category.VISA);
        assertThat(CollectedNotices.category("기숙사", "입사 모집 안내")).isEqualTo(Category.ETC);
        assertThat(CollectedNotices.title("기숙사", "입사 모집")).isEqualTo("[기숙사] 입사 모집");
        assertThat(CollectedNotices.title("", "입사 모집")).isEqualTo("입사 모집");
    }

    @Test
    void missingBodyAndDateStayExplicit() {
        var notice = CollectedNotices.toNotice(school("5", "", "이미지 공지", null, ""));

        assertThat(notice.postedAt()).isNull();
        assertThat(notice.originalContent()).isEqualTo(CollectedNotices.MISSING_CONTENT);
    }

    @Test
    void noReadableBoardIsReportedInsteadOfShowingSamples() {
        when(collector.collect()).thenReturn(List.of());

        assertThatThrownBy(() -> repository(new MutableClock(), new ArrayList<>()).findAll())
                .isInstanceOf(CollectedNoticeRepository.NoticeSourceUnavailableException.class);
        verifyNoInteractions(samples);
    }

    @Test
    void staleNoticesRefreshInBackgroundWithoutBlocking() {
        var calls = new AtomicInteger();
        when(collector.collect()).thenAnswer(call ->
                List.of(school(String.valueOf(calls.incrementAndGet()), "", "공지", null, "본문")));
        var clock = new MutableClock();
        var background = new ArrayList<Runnable>();
        var repository = repository(clock, background);

        assertThat(repository.findAll()).extracting(Notice::noticeId).containsExactly("erica-pharmacy-1");
        clock.now = clock.now.plusSeconds(30 * 60);
        repository.findAll();
        assertThat(background).isEmpty();

        clock.now = clock.now.plusSeconds(60 * 60);
        assertThat(repository.findAll()).extracting(Notice::noticeId).containsExactly("erica-pharmacy-1");
        assertThat(background).hasSize(1);
        background.getFirst().run();
        assertThat(repository.findAll()).extracting(Notice::noticeId).containsExactly("erica-pharmacy-2");
    }

    @Test
    void failedRefreshKeepsPreviousNotices() {
        when(collector.collect()).thenReturn(List.of(school("1", "", "공지", null, "본문"))).thenReturn(List.of());
        var clock = new MutableClock();
        var background = new ArrayList<Runnable>();
        var repository = repository(clock, background);

        repository.findAll();
        clock.now = clock.now.plusSeconds(2 * 60 * 60);
        repository.findAll();
        background.getFirst().run();

        assertThat(repository.findAll()).extracting(Notice::noticeId).containsExactly("erica-pharmacy-1");
    }

    @Test
    void disabledCollectionUsesSamplesWithoutTouchingSchoolSites() {
        var repository = new CollectedNoticeRepository(samples, collector, false, Runnable::run, Clock.systemUTC());

        repository.findAll();

        verify(samples).findAll();
        verifyNoInteractions(collector);
    }

    private static MatchStatus match(NoticeMatcher matcher, Notice notice, String degree) {
        return matcher.match(notice.targetConditions(), notice.analysisStatus(),
                new StudentProfile(null, null, degree, null)).status();
    }

    private static class MutableClock extends Clock {
        Instant now = Instant.parse("2026-11-03T00:00:00Z");

        @Override public ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(ZoneId zone) { return this; }
        @Override public Instant instant() { return now; }
    }
}
