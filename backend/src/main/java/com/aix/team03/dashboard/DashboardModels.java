package com.aix.team03.dashboard;

import com.aix.team03.matching.MatchingModels.AnalysisStatus;
import com.aix.team03.matching.MatchingModels.MatchStatus;
import com.aix.team03.matching.MatchingModels.StudentProfile;
import com.aix.team03.matching.MatchingModels.TargetConditions;
import jakarta.validation.constraints.Size;
import java.util.List;

/** #6 맞춤형 학교 대시보드 요청·응답. 프로필은 브라우저에만 있어 요청 본문으로 받고 서버에 저장하지 않는다. */
public final class DashboardModels {
    private DashboardModels() {}

    public record DashboardRequest(
            @Size(max = 50) String nationality,
            @Size(max = 50) String visaType,
            @Size(max = 50) String degree,
            @Size(max = 50) String year) {
        StudentProfile toProfile() { return new StudentProfile(nationality, visaType, degree, year); }
    }

    /** 대상 조건이 붙은 공지. 지금은 시드 데이터이고, #8 공지 저장소가 생기면 그쪽에서 받는다. */
    public record TargetedNotice(String noticeId, String title, String category, String postedAt, String deadline,
            String sourceUrl, TargetConditions targetConditions, AnalysisStatus analysisStatus) {}

    public record DashboardNotice(String noticeId, String title, String category, String postedAt, String deadline,
            String sourceUrl, List<String> matchReasons, MatchStatus matchStatus, AnalysisStatus analysisStatus,
            String savedScheduleId) {}

    public record DashboardResponse(boolean profileCompleted, List<String> missingProfileFields,
            List<DashboardNotice> matchedNotices) {}
}
