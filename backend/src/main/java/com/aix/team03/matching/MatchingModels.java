package com.aix.team03.matching;

import java.util.List;

/** 공지 대상 조건과 사용자 프로필을 비교하는 판별의 입력·출력. #6 대시보드와 #8 공지 목록·상세가 함께 쓴다. */
public final class MatchingModels {
    private MatchingModels() {}

    /** 공지 자체의 대상 조건 분석 상태. 사용자와 무관하다. */
    public enum AnalysisStatus { CONFIRMED, UNCERTAIN, NOT_ANALYZED }

    /** 이 사용자에게 해당하는지. AnalysisStatus와 프로필로 계산한다. */
    public enum MatchStatus { APPLICABLE, NEEDS_REVIEW, NOT_APPLICABLE }

    /** 각 목록이 null이거나 비어 있으면 그 조건은 전체 대상이다. years는 "1"~"6" 문자열이다. */
    public record TargetConditions(List<String> nationalities, List<String> visaTypes, List<String> degrees,
            List<String> years) {}

    /** 판별에 쓰는 프로필 항목만 담는다. 값이 없거나 코드로 읽을 수 없으면 판단 불가로 본다. */
    public record StudentProfile(String nationality, String visaType, String degree, String year) {}

    /** reasons는 화면에 그대로 보여줄 한국어 사유이며 항상 1개 이상이다. */
    public record MatchResult(MatchStatus status, List<String> reasons) {}
}
