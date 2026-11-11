package com.aix.team03.dashboard;

import com.aix.team03.matching.MatchingModels.MatchStatus;
import com.aix.team03.matching.MatchingModels.StudentProfile;
import com.aix.team03.matching.NoticeMatcher;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import static com.aix.team03.dashboard.DashboardModels.*;

/** 공지마다 프로필과 대상 조건을 판별해 해당하거나 확인이 필요한 공지만 대시보드에 보여준다. */
@Service
public class DashboardService {
    // 응답의 missingProfileFields에는 요청 필드명을 그대로 쓴다.
    private static final Map<NoticeMatcher.Field, String> FIELD_NAMES = Map.of(
            NoticeMatcher.Field.NATIONALITY, "nationality", NoticeMatcher.Field.VISA_TYPE, "visaType",
            NoticeMatcher.Field.DEGREE, "degree", NoticeMatcher.Field.YEAR, "year");

    private final NoticeSource notices;
    private final NoticeMatcher matcher;
    private final Clock clock;

    @Autowired
    public DashboardService(NoticeSource notices, NoticeMatcher matcher) {
        this(notices, matcher, Clock.systemUTC());
    }

    // 테스트에서 마감 지남 여부의 기준 시각을 고정하기 위한 생성자.
    DashboardService(NoticeSource notices, NoticeMatcher matcher, Clock clock) {
        this.notices = notices;
        this.matcher = matcher;
        this.clock = clock;
    }

    public DashboardResponse dashboard(StudentProfile profile, String collegeId, int limit) {
        var recognized = matcher.recognizedValues(profile);
        List<String> missing = Arrays.stream(NoticeMatcher.Field.values())
                .filter(field -> !recognized.containsKey(field))
                .map(FIELD_NAMES::get)
                .toList();

        Instant now = clock.instant();
        // 순서: 해당(APPLICABLE)을 확인 필요(NEEDS_REVIEW)보다 먼저 → 각각 마감 임박순 → 마감 없는 공지는 게시일 최신순.
        // limit으로 자르기 전에 정렬해서 확인 필요 공지가 해당 공지 자리를 차지하지 않게 한다. 마감이 지난 공지는 뺀다.
        var matched = notices.notices(collegeId).stream()
                .filter(notice -> !isPast(notice.deadline(), now))
                .map(notice -> {
                    var result = matcher.match(notice.targetConditions(), notice.analysisStatus(), profile);
                    return new DashboardNotice(notice.noticeId(), notice.title(), notice.category(),
                            notice.postedAt(), notice.deadline(), notice.sourceUrl(), result.reasons(),
                            result.status(), notice.analysisStatus(), null, notice.sample());
                })
                .filter(notice -> notice.matchStatus() != MatchStatus.NOT_APPLICABLE)
                .sorted(Comparator.comparing((DashboardNotice notice) -> notice.matchStatus() != MatchStatus.APPLICABLE)
                        .thenComparing(notice -> parseInstant(notice.deadline()),
                                Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(DashboardNotice::postedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(limit)
                .toList();
        return new DashboardResponse(missing.isEmpty(), missing, matched);
    }

    private static boolean isPast(String deadline, Instant now) {
        Instant due = parseInstant(deadline);
        return due != null && due.isBefore(now);
    }

    // 마감은 오프셋이 붙은 ISO 8601 문자열이다. 읽을 수 없는 값은 마감 없음으로 둔다.
    private static Instant parseInstant(String value) {
        if (value == null) return null;
        try {
            return OffsetDateTime.parse(value).toInstant();
        } catch (DateTimeParseException exception) {
            return null;
        }
    }
}
