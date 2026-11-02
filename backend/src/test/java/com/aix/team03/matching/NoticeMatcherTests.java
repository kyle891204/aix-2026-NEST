package com.aix.team03.matching;

import java.util.List;
import org.junit.jupiter.api.Test;
import static com.aix.team03.matching.MatchingModels.*;
import static org.assertj.core.api.Assertions.assertThat;

class NoticeMatcherTests {
    private final NoticeMatcher matcher = new NoticeMatcher();
    private final StudentProfile student = new StudentProfile("VN", "D-2", "BACHELOR", "2");

    private static TargetConditions degreesAndYears(List<String> degrees, List<String> years) {
        return new TargetConditions(null, null, degrees, years);
    }

    @Test
    void noticeWithoutConditionsAppliesToEveryone() {
        var result = matcher.match(new TargetConditions(null, List.of(), null, List.of()),
                AnalysisStatus.CONFIRMED, new StudentProfile(null, null, null, null));
        assertThat(result.status()).isEqualTo(MatchStatus.APPLICABLE);
        assertThat(result.reasons()).containsExactly("전체 학생 대상");
        assertThat(matcher.match(null, AnalysisStatus.CONFIRMED, student).status()).isEqualTo(MatchStatus.APPLICABLE);
    }

    @Test
    void everySpecifiedConditionMustMatch() {
        var result = matcher.match(new TargetConditions(List.of("VN", "CN"), List.of("D-2"),
                List.of("BACHELOR", "MASTER"), List.of("1", "2")), AnalysisStatus.CONFIRMED, student);
        assertThat(result.status()).isEqualTo(MatchStatus.APPLICABLE);
        assertThat(result.reasons()).containsExactly("국적(VN) 대상", "D-2 비자 대상", "학사과정 대상", "2학년 대상");
    }

    @Test
    void oneClearMismatchOnAConfirmedNoticeIsNotApplicable() {
        var result = matcher.match(degreesAndYears(List.of("BACHELOR"), List.of("3", "4")),
                AnalysisStatus.CONFIRMED, student);
        assertThat(result.status()).isEqualTo(MatchStatus.NOT_APPLICABLE);
        assertThat(result.reasons()).containsExactly("학사과정 대상", "학년 조건이 맞지 않아요");
    }

    @Test
    void missingProfileValueNeedsReviewInsteadOfHiding() {
        var noVisa = new StudentProfile("VN", null, "BACHELOR", "2");
        var result = matcher.match(new TargetConditions(null, List.of("D-2"), null, null),
                AnalysisStatus.CONFIRMED, noVisa);
        assertThat(result.status()).isEqualTo(MatchStatus.NEEDS_REVIEW);
        assertThat(result.reasons()).containsExactly("비자 정보가 없어 확인이 필요해요");
    }

    @Test
    void freeTextProfileValuesAreTreatedAsMissing() {
        // 회원가입 화면이 아직 자유 텍스트라 "베트남", "학부생" 같은 값이 올 수 있다.
        var freeText = new StudentProfile("베트남", "유학 비자", "학부생", "2학년");
        assertThat(matcher.recognizedValues(freeText)).isEmpty();
        var result = matcher.match(degreesAndYears(List.of("BACHELOR"), null), AnalysisStatus.CONFIRMED, freeText);
        assertThat(result.status()).isEqualTo(MatchStatus.NEEDS_REVIEW);
        assertThat(result.reasons()).containsExactly("학위과정 정보가 없어 확인이 필요해요");
    }

    @Test
    void codesAreComparedIgnoringCaseAndSurroundingSpaces() {
        var messy = new StudentProfile(" vn ", "d-2", "bachelor", " 2 ");
        var result = matcher.match(new TargetConditions(List.of("VN"), List.of("D-2"), List.of("BACHELOR"),
                List.of("2")), AnalysisStatus.CONFIRMED, messy);
        assertThat(result.status()).isEqualTo(MatchStatus.APPLICABLE);
    }

    @Test
    void detailedVisaMatchesItsParentVisaButNotTheOtherWay() {
        var d21 = new StudentProfile("VN", "D-2-1", "BACHELOR", "2");
        var parentNotice = matcher.match(new TargetConditions(null, List.of("D-2"), null, null),
                AnalysisStatus.CONFIRMED, d21);
        assertThat(parentNotice.status()).isEqualTo(MatchStatus.APPLICABLE);
        assertThat(parentNotice.reasons()).containsExactly("D-2-1 비자 대상");

        var detailedNotice = matcher.match(new TargetConditions(null, List.of("D-2-1"), null, null),
                AnalysisStatus.CONFIRMED, student);
        assertThat(detailedNotice.status()).isEqualTo(MatchStatus.NOT_APPLICABLE);

        // D-2가 D-20 같은 다른 비자에 잘못 걸리지 않는다.
        var d20 = matcher.match(new TargetConditions(null, List.of("D-2"), null, null), AnalysisStatus.CONFIRMED,
                new StudentProfile(null, "D-20", null, null));
        assertThat(d20.status()).isEqualTo(MatchStatus.NOT_APPLICABLE);
    }

    @Test
    void uncertainAnalysisNeedsReviewEvenWhenConditionsDoNotMatch() {
        var result = matcher.match(new TargetConditions(List.of("CN"), null, null, null),
                AnalysisStatus.UNCERTAIN, student);
        assertThat(result.status()).isEqualTo(MatchStatus.NEEDS_REVIEW);
        assertThat(result.reasons()).containsExactly("국적 조건이 맞지 않아요", "공지 대상 분석이 확실하지 않아 확인이 필요해요");
    }

    @Test
    void notAnalyzedNoticeNeedsReview() {
        var result = matcher.match(null, AnalysisStatus.NOT_ANALYZED, student);
        assertThat(result.status()).isEqualTo(MatchStatus.NEEDS_REVIEW);
        assertThat(result.reasons()).containsExactly("아직 대상 조건을 분석하지 않은 공지예요");
    }
}
