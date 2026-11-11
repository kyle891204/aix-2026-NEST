package com.aix.team03.dashboard;

import com.aix.team03.matching.MatchingModels.AnalysisStatus;
import com.aix.team03.matching.MatchingModels.MatchStatus;
import com.aix.team03.matching.MatchingModels.StudentProfile;
import com.aix.team03.matching.MatchingModels.TargetConditions;
import java.util.List;

/** #6 맞춤형 학교 대시보드 요청·응답. 프로필은 브라우저에만 있어 요청 본문으로 받고 서버에 저장하지 않는다. */
public final class DashboardModels {
    private DashboardModels() {}

    // 길이 제한으로 400을 내지 않는다. 저장된 프로필 값이 길어도 대시보드가 막히지 않고, 코드로 읽을 수 없는 값은 값 없음으로 판별한다.
    // collegeId는 공지를 고를 때만 쓰고 판별에는 쓰지 않는다. 없으면 ERICA 전체 공지만 본다.
    public record DashboardRequest(String nationality, String visaType, String degree, String year,
            String collegeId) {
        StudentProfile toProfile() { return new StudentProfile(nationality, visaType, degree, year); }
    }

    /**
     * 대상 조건이 붙은 공지. #8 공지 저장소의 공지를 대시보드 판별에 필요한 값만 남겨 받는다.
     * sample은 공지 수집을 끈 환경(로컬·자동 테스트)의 예시 공지다.
     */
    public record TargetedNotice(String noticeId, String title, String category, String postedAt, String deadline,
            String sourceUrl, TargetConditions targetConditions, AnalysisStatus analysisStatus, boolean sample) {}

    public record DashboardNotice(String noticeId, String title, String category, String postedAt, String deadline,
            String sourceUrl, List<String> matchReasons, MatchStatus matchStatus, AnalysisStatus analysisStatus,
            String savedScheduleId, boolean sample) {}

    public record DashboardResponse(boolean profileCompleted, List<String> missingProfileFields,
            List<DashboardNotice> matchedNotices) {}
}
