package com.aix.team03.matching;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Predicate;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;
import static com.aix.team03.matching.MatchingModels.*;

/**
 * 공지 대상 조건과 프로필을 비교해 matchStatus와 사유를 계산한다. 규칙은 API 명세 #6 "판별 규칙"을 따른다.
 * - APPLICABLE: 분석이 CONFIRMED이고 지정된 조건을 모두 만족
 * - NEEDS_REVIEW: 조건에 필요한 프로필 값이 없거나, 분석이 UNCERTAIN·NOT_ANALYZED
 * - NOT_APPLICABLE: 분석이 CONFIRMED이고 조건 하나라도 명확히 불일치
 */
@Component
public class NoticeMatcher {
    public enum Field { NATIONALITY, VISA_TYPE, DEGREE, YEAR }

    public static final Map<String, String> DEGREE_LABELS = Map.of(
            "BACHELOR", "학사과정", "MASTER", "석사과정", "DOCTORAL", "박사과정",
            "EXCHANGE", "교환학생", "LANGUAGE", "어학연수생");

    private static final Pattern NATIONALITY = Pattern.compile("[A-Z]{2}");
    private static final Pattern VISA_TYPE = Pattern.compile("[A-Z]-\\d{1,2}(-\\d{1,2})?");
    private static final Pattern YEAR = Pattern.compile("[1-6]");

    private enum Outcome { MATCH, MISMATCH, UNKNOWN }

    public MatchResult match(TargetConditions conditions, AnalysisStatus analysis, StudentProfile profile) {
        var target = conditions == null ? new TargetConditions(null, null, null, null) : conditions;
        var values = recognizedValues(profile);
        var reasons = new ArrayList<String>();
        boolean mismatch = false;
        boolean unknown = false;
        for (var field : Field.values()) {
            List<String> allowed = allowed(target, field);
            if (allowed == null || allowed.isEmpty()) continue;
            String value = values.get(field);
            Outcome outcome = value == null ? Outcome.UNKNOWN
                    : allowed.stream().map(NoticeMatcher::normalize).anyMatch(condition -> satisfies(field, value, condition))
                            ? Outcome.MATCH
                    : Outcome.MISMATCH;
            mismatch |= outcome == Outcome.MISMATCH;
            unknown |= outcome == Outcome.UNKNOWN;
            reasons.add(reason(field, outcome, value));
        }

        MatchStatus status;
        if (analysis == AnalysisStatus.CONFIRMED && mismatch) status = MatchStatus.NOT_APPLICABLE;
        else if (analysis != AnalysisStatus.CONFIRMED || unknown) status = MatchStatus.NEEDS_REVIEW;
        else status = MatchStatus.APPLICABLE;

        if (analysis == AnalysisStatus.UNCERTAIN) reasons.add("공지 대상 분석이 확실하지 않아 확인이 필요해요");
        else if (analysis != AnalysisStatus.CONFIRMED) reasons.add("아직 대상 조건을 분석하지 않은 공지예요");
        if (reasons.isEmpty()) reasons.add("전체 학생 대상");
        return new MatchResult(status, List.copyOf(reasons));
    }

    /** 코드로 읽을 수 있는 프로필 값만 남긴다. 자유 텍스트처럼 읽을 수 없는 값은 비어 있는 것으로 본다. */
    public Map<Field, String> recognizedValues(StudentProfile profile) {
        var values = new EnumMap<Field, String>(Field.class);
        if (profile == null) return values;
        put(values, Field.NATIONALITY, profile.nationality(), NATIONALITY.asMatchPredicate());
        put(values, Field.VISA_TYPE, profile.visaType(), VISA_TYPE.asMatchPredicate());
        put(values, Field.DEGREE, profile.degree(), DEGREE_LABELS::containsKey);
        put(values, Field.YEAR, profile.year(), YEAR.asMatchPredicate());
        return values;
    }

    private static void put(Map<Field, String> values, Field field, String raw, Predicate<String> recognized) {
        String value = normalize(raw);
        if (value != null && recognized.test(value)) values.put(field, value);
    }

    private static String normalize(String value) {
        if (value == null || value.isBlank()) return null;
        return value.strip().toUpperCase(Locale.ROOT);
    }

    // 세부 비자(D-2-1)는 상위 비자(D-2) 대상 공지에도 해당한다. 반대(D-2 학생이 D-2-1 공지)는 해당하지 않는다.
    private static boolean satisfies(Field field, String value, String condition) {
        if (value.equals(condition)) return true;
        return field == Field.VISA_TYPE && condition != null && value.startsWith(condition + "-");
    }

    private static List<String> allowed(TargetConditions target, Field field) {
        return switch (field) {
            case NATIONALITY -> target.nationalities();
            case VISA_TYPE -> target.visaTypes();
            case DEGREE -> target.degrees();
            case YEAR -> target.years();
        };
    }

    private static String reason(Field field, Outcome outcome, String value) {
        String label = switch (field) {
            case NATIONALITY -> "국적";
            case VISA_TYPE -> "비자";
            case DEGREE -> "학위과정";
            case YEAR -> "학년";
        };
        return switch (outcome) {
            case UNKNOWN -> label + " 정보가 없어 확인이 필요해요";
            case MISMATCH -> label + " 조건이 맞지 않아요";
            case MATCH -> switch (field) {
                case NATIONALITY -> "국적(" + value + ") 대상";
                case VISA_TYPE -> value + " 비자 대상";
                case DEGREE -> DEGREE_LABELS.get(value) + " 대상";
                case YEAR -> value + "학년 대상";
            };
        };
    }
}
