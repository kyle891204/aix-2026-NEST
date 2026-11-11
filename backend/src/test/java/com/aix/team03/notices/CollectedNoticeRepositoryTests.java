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
import java.util.function.Consumer;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
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

    /** 목록 단계의 공지: 본문과 첨부가 아직 없다. */
    private static SchoolNotice listed(SchoolNotice notice) {
        return new SchoolNotice(notice.boardKey(), notice.kind(), notice.boardName(), notice.collegeId(), notice.id(),
                notice.label(), notice.title(), notice.postedAt(), notice.url(), null, List.of());
    }

    // 상세를 읽으면 목록 공지에 본문과 첨부를 붙여 돌려주는 수집기로 꾸민다.
    @SuppressWarnings("unchecked")
    private void detailsReturn(String content) {
        doAnswer(call -> {
            List<SchoolNotice> pending = call.getArgument(0);
            ((Consumer<List<SchoolNotice>>) call.getArgument(1)).accept(pending.stream()
                    .map(notice -> school(notice.id(), notice.label(), notice.title(), notice.postedAt(), content))
                    .toList());
            return null;
        }).when(collector).collectDetails(anyList(), any());
    }

    @Test
    void firstReadShowsListsThenFillsBodiesInBackground() {
        when(collector.collectLists()).thenReturn(List.of(
                listed(school("1", "일반", "오래된 공지", LocalDate.of(2026, 9, 1), "본문")),
                listed(school("2", "대학원", "모집요강 공고", LocalDate.of(2026, 10, 1), "본문"))));
        detailsReturn("본문");
        var background = new ArrayList<Runnable>();
        var repository = repository(new MutableClock(), background);

        var notices = repository.findAll();

        assertThat(notices).extracting(Notice::noticeId).containsExactly("erica-pharmacy-2", "erica-pharmacy-1");
        assertThat(notices).allSatisfy(notice -> {
            assertThat(notice.sample()).isFalse();
            assertThat(notice.originalContent()).isEqualTo(CollectedNotices.LOADING_CONTENT);
        });
        verify(collector, never()).collectDetails(anyList(), any());

        background.getFirst().run();

        assertThat(repository.findAll()).allSatisfy(notice -> {
            assertThat(notice.originalContent()).isEqualTo("본문");
            assertThat(notice.attachments()).hasSize(1);
        });
        verifyNoInteractions(samples);
    }

    @Test
    @SuppressWarnings("unchecked")
    void refreshReadsDetailsOnlyForNewNotices() {
        var old = listed(school("1", "", "공지", null, "본문"));
        var fresh = listed(school("2", "", "새 공지", null, "본문"));
        when(collector.collectLists()).thenReturn(List.of(old)).thenReturn(List.of(fresh, old));
        detailsReturn("본문");
        var clock = new MutableClock();
        var background = new ArrayList<Runnable>();
        var repository = repository(clock, background);

        repository.findAll();
        background.removeFirst().run();
        clock.now = clock.now.plusSeconds(2 * 60 * 60);
        repository.findAll();
        background.removeFirst().run();

        // 새로 올라온 2번만 상세를 읽고, 1번은 읽어 둔 본문을 그대로 보여준다.
        assertThat(repository.findAll()).filteredOn(notice -> notice.noticeId().equals("erica-pharmacy-1"))
                .singleElement().satisfies(notice -> assertThat(notice.originalContent()).isEqualTo("본문"));
        var pendings = ArgumentCaptor.forClass(List.class);
        background.removeFirst().run();
        verify(collector, times(2)).collectDetails(pendings.capture(), any());
        assertThat((List<SchoolNotice>) pendings.getAllValues().getLast()).extracting(SchoolNotice::id).containsExactly("2");
    }

    @Test
    void startupCollectionRunsInBackgroundOnlyWhenEnabled() {
        var background = new ArrayList<Runnable>();
        new CollectedNoticeRepository(samples, collector, false, background::add, Clock.systemUTC()).collectOnStartup();
        assertThat(background).isEmpty();

        when(collector.collectLists()).thenReturn(List.of(listed(school("1", "", "공지", null, "본문"))));
        var repository = repository(new MutableClock(), background);
        repository.collectOnStartup();
        assertThat(background).hasSize(1);
        background.removeFirst().run();

        assertThat(repository.findAll()).extracting(Notice::noticeId).containsExactly("erica-pharmacy-1");
        verify(collector, times(1)).collectLists();
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
    void readsDegreeFromEachWordOfLabel() {
        assertThat(CollectedNotices.degrees("ERICA 학부")).containsExactly("BACHELOR");
        assertThat(CollectedNotices.degrees("학부/대학원")).containsExactly("BACHELOR", "MASTER", "DOCTORAL");
        assertThat(CollectedNotices.degrees("ERICA")).isEmpty();
        assertThat(CollectedNotices.degrees("")).isEmpty();
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
        assertThat(CollectedNotices.toNotice(listed(school("6", "", "목록만 읽은 공지", null, "본문"))).originalContent())
                .isEqualTo(CollectedNotices.LOADING_CONTENT);
        // 상세를 읽지 못한 공지는 이미지 공지와 다르게 안내한다.
        var unread = school("7", "", "읽지 못한 공지", null, "");
        assertThat(CollectedNotices.toNotice(new SchoolNotice(unread.boardKey(), unread.kind(), unread.boardName(),
                unread.collegeId(), unread.id(), unread.label(), unread.title(), null, unread.url(), "", List.of(),
                true)).originalContent()).isEqualTo(CollectedNotices.FAILED_CONTENT);
    }

    @Test
    void noReadableBoardIsReportedInsteadOfShowingSamples() {
        when(collector.collectLists()).thenReturn(List.of());

        assertThatThrownBy(() -> repository(new MutableClock(), new ArrayList<>()).findAll())
                .isInstanceOf(CollectedNoticeRepository.NoticeSourceUnavailableException.class);
        verifyNoInteractions(samples);
    }

    @Test
    void failedFirstCollectionIsRetriedAfterAMinute() {
        when(collector.collectLists()).thenReturn(List.of())
                .thenReturn(List.of(listed(school("1", "", "공지", null, "본문"))));
        var clock = new MutableClock();
        var repository = repository(clock, new ArrayList<>());

        assertThatThrownBy(repository::findAll).isInstanceOf(CollectedNoticeRepository.NoticeSourceUnavailableException.class);
        // 1분 안에는 학교 사이트에 다시 요청하지 않는다.
        clock.now = clock.now.plusSeconds(30);
        assertThatThrownBy(repository::findAll).isInstanceOf(CollectedNoticeRepository.NoticeSourceUnavailableException.class);
        verify(collector, times(1)).collectLists();

        clock.now = clock.now.plusSeconds(60);
        assertThat(repository.findAll()).extracting(Notice::noticeId).containsExactly("erica-pharmacy-1");
        verify(collector, times(2)).collectLists();
    }

    @Test
    void staleNoticesRefreshInBackgroundWithoutBlocking() {
        var calls = new AtomicInteger();
        when(collector.collectLists()).thenAnswer(call ->
                List.of(listed(school(String.valueOf(calls.incrementAndGet()), "", "공지", null, "본문"))));
        var clock = new MutableClock();
        var background = new ArrayList<Runnable>();
        var repository = repository(clock, background);

        assertThat(repository.findAll()).extracting(Notice::noticeId).containsExactly("erica-pharmacy-1");
        background.clear();
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
        when(collector.collectLists()).thenReturn(List.of(listed(school("1", "", "공지", null, "본문"))))
                .thenReturn(List.of());
        var clock = new MutableClock();
        var background = new ArrayList<Runnable>();
        var repository = repository(clock, background);

        repository.findAll();
        background.clear();
        clock.now = clock.now.plusSeconds(2 * 60 * 60);
        repository.findAll();
        background.getFirst().run();

        assertThat(repository.findAll()).extracting(Notice::noticeId).containsExactly("erica-pharmacy-1");
    }

    @Test
    void boardMissingFromRefreshKeepsItsPreviousNotices() {
        var global = new SchoolNotice("erica-global", BoardKind.INTERNATIONAL, "ERICA 국제처", null, "9", "", "비자 안내",
                null, "https://global.hanyang.ac.kr/bbs/board.php?wr_id=9", null, List.of());
        // 두 번째 수집에서는 약학대학 게시판만 못 읽었다.
        when(collector.collectLists()).thenReturn(List.of(listed(school("1", "", "공지", null, "본문")), global))
                .thenReturn(List.of(global));
        var clock = new MutableClock();
        var background = new ArrayList<Runnable>();
        var repository = repository(clock, background);

        repository.findAll();
        background.clear();
        clock.now = clock.now.plusSeconds(2 * 60 * 60);
        repository.findAll();
        background.getFirst().run();

        assertThat(repository.findAll()).extracting(Notice::noticeId)
                .containsExactlyInAnyOrder("erica-global-9", "erica-pharmacy-1");
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
