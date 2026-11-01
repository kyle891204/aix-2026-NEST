package com.aix.team03.dashboard;

import com.aix.team03.matching.MatchingModels.AnalysisStatus;
import com.aix.team03.matching.MatchingModels.MatchStatus;
import com.aix.team03.matching.MatchingModels.StudentProfile;
import com.aix.team03.matching.MatchingModels.TargetConditions;
import com.aix.team03.matching.NoticeMatcher;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.Test;
import static com.aix.team03.dashboard.DashboardModels.*;
import static org.assertj.core.api.Assertions.assertThat;

class DashboardServiceTests {
    // 마감 지남 여부의 기준 시각. 실제 날짜가 지나도 결과가 바뀌지 않게 고정한다.
    private static final Clock NOW = Clock.fixed(Instant.parse("2026-11-01T00:00:00Z"), ZoneOffset.UTC);
    private static final TargetConditions EVERYONE = new TargetConditions(null, null, null, null);
    private static final StudentProfile BACHELOR_2 = new StudentProfile("VN", null, "BACHELOR", "2");

    private static TargetedNotice notice(String id, String postedAt, String deadline, TargetConditions conditions,
            AnalysisStatus analysis) {
        return new TargetedNotice(id, "공지 " + id, "ETC", postedAt, deadline, null, conditions, analysis);
    }

    private static DashboardService service(TargetedNotice... notices) {
        return new DashboardService(() -> List.of(notices), new NoticeMatcher(), NOW);
    }

    @Test
    void notApplicableAndPastDeadlineNoticesAreLeftOut() {
        var result = service(
                notice("applies", "2026-10-20", null, EVERYONE, AnalysisStatus.CONFIRMED),
                notice("masters-only", "2026-10-20", null,
                        new TargetConditions(null, null, List.of("MASTER"), null), AnalysisStatus.CONFIRMED),
                notice("expired", "2026-10-20", "2026-10-31T18:00:00+09:00", EVERYONE, AnalysisStatus.CONFIRMED),
                notice("needs-visa", "2026-10-20", null,
                        new TargetConditions(null, List.of("D-2"), null, null), AnalysisStatus.CONFIRMED))
                .dashboard(BACHELOR_2, 20);

        assertThat(result.matchedNotices()).extracting(DashboardNotice::noticeId)
                .containsExactlyInAnyOrder("applies", "needs-visa");
        assertThat(result.matchedNotices()).filteredOn(item -> item.noticeId().equals("needs-visa"))
                .singleElement().satisfies(item -> {
                    assertThat(item.matchStatus()).isEqualTo(MatchStatus.NEEDS_REVIEW);
                    assertThat(item.matchReasons()).containsExactly("비자 정보가 없어 확인이 필요해요");
                    assertThat(item.savedScheduleId()).isNull();
                });
    }

    @Test
    void soonestDeadlineFirstThenNewestPostWithoutDeadline() {
        var result = service(
                notice("old-no-deadline", "2026-10-01", null, EVERYONE, AnalysisStatus.CONFIRMED),
                notice("later", "2026-10-02", "2026-11-20T18:00:00+09:00", EVERYONE, AnalysisStatus.CONFIRMED),
                notice("new-no-deadline", "2026-10-30", null, EVERYONE, AnalysisStatus.CONFIRMED),
                notice("soon", "2026-10-03", "2026-11-05T09:00:00+09:00", EVERYONE, AnalysisStatus.CONFIRMED))
                .dashboard(BACHELOR_2, 20);

        assertThat(result.matchedNotices()).extracting(DashboardNotice::noticeId)
                .containsExactly("soon", "later", "new-no-deadline", "old-no-deadline");
    }

    @Test
    void limitCapsTheNumberOfNotices() {
        var result = service(
                notice("a", "2026-10-01", null, EVERYONE, AnalysisStatus.CONFIRMED),
                notice("b", "2026-10-02", null, EVERYONE, AnalysisStatus.CONFIRMED),
                notice("c", "2026-10-03", null, EVERYONE, AnalysisStatus.CONFIRMED))
                .dashboard(BACHELOR_2, 2);
        assertThat(result.matchedNotices()).extracting(DashboardNotice::noticeId).containsExactly("c", "b");
    }

    @Test
    void missingProfileFieldsListUnrecognizedValuesByRequestName() {
        var partial = service().dashboard(new StudentProfile("VN", null, "학부생", "2"), 20);
        assertThat(partial.profileCompleted()).isFalse();
        assertThat(partial.missingProfileFields()).containsExactly("visaType", "degree");

        var complete = service().dashboard(new StudentProfile("VN", "D-2", "BACHELOR", "2"), 20);
        assertThat(complete.profileCompleted()).isTrue();
        assertThat(complete.missingProfileFields()).isEmpty();
    }
}
