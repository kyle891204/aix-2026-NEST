package com.aix.team03.course;

import com.aix.team03.integrations.lms.HanyangLmsClient;
import com.aix.team03.integrations.lms.LmsIntegrationException;
import com.aix.team03.integrations.lms.LmsModels;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.stream.Stream;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import static com.aix.team03.course.CourseModels.*;

/** 공통 LMS 계정으로 과목·공지·과제·학습자료를 조회해 과목알림 형식으로 합친다. 사용자별 수강 여부는 판별하지 않는다. */
@Service
public class CourseService {
    // 학습자료로 보여줄 모듈 항목 종류. 과제·퀴즈·토론은 각자의 목록에서 다룬다.
    private static final Set<String> MATERIAL_TYPES = Set.of("File", "Page", "ExternalUrl", "ExternalTool");
    private static final Comparator<String> NEWEST_FIRST = Comparator.nullsLast(Comparator.reverseOrder());

    private final HanyangLmsClient lms;
    private final Clock clock;

    @Autowired
    public CourseService(HanyangLmsClient lms) { this(lms, Clock.systemUTC()); }

    // 테스트에서 마감 지남 여부의 기준 시각을 고정하기 위한 생성자.
    CourseService(HanyangLmsClient lms, Clock clock) {
        this.lms = lms;
        this.clock = clock;
    }

    public CourseList courses() {
        var page = lms.courses();
        // 학기 정보는 LMS 과목 목록에 include[]=term을 요청해야 받을 수 있어 아직 null로 둔다.
        var courses = page.items().stream()
                .map(course -> new CourseSummary(String.valueOf(course.id()), course.name(), course.courseCode(), null))
                .toList();
        return new CourseList(courses, page.truncated());
    }

    public CourseNotifications notifications(long courseId, Set<NotificationType> types, LocalDate start, LocalDate end) {
        // 잘못된 입력은 일부 실패로 섞지 않고 LMS 호출 전에 400으로 끝낸다.
        if (courseId <= 0 || end.isBefore(start) || ChronoUnit.DAYS.between(start, end) > 366) {
            throw new LmsIntegrationException("INVALID_LMS_QUERY", "과목 ID와 날짜 범위(최대 366일)를 확인하세요.",
                    HttpStatus.BAD_REQUEST, null);
        }
        var notifications = new ArrayList<Notification>();
        var errors = new ArrayList<NotificationError>();
        LmsIntegrationException firstFailure = null;
        for (var type : NotificationType.values()) {
            if (!types.contains(type)) continue;
            try {
                notifications.addAll(switch (type) {
                    case ANNOUNCEMENT -> announcements(courseId, start, end);
                    case ASSIGNMENT -> assignments(courseId);
                    case MATERIAL -> materials(courseId);
                });
            } catch (LmsIntegrationException exception) {
                // 한 유형이 실패해도 나머지는 보여주고, 실패한 유형은 화면에서 따로 안내한다.
                errors.add(new NotificationError(type, exception.getCode()));
                if (firstFailure == null) firstFailure = exception;
            }
        }
        // 요청한 유형이 모두 실패하면 빈 목록 대신 LMS 오류를 그대로 돌려준다.
        if (firstFailure != null && errors.size() == types.size()) throw firstFailure;
        return new CourseNotifications(String.valueOf(courseId), List.copyOf(notifications), List.copyOf(errors));
    }

    private List<Notification> announcements(long courseId, LocalDate start, LocalDate end) {
        return lms.announcements(courseId, start, end).items().stream()
                .sorted(Comparator.comparing(LmsModels.Announcement::postedAt, NEWEST_FIRST))
                .map(item -> new Notification("announcement-" + item.id(), NotificationType.ANNOUNCEMENT,
                        item.title(), item.postedAt(), null, null, null, null, item.htmlUrl(), null))
                .toList();
    }

    private List<Notification> assignments(long courseId) {
        // 마감일은 LMS가 사용자에게 적용한 값을 그대로 쓰고 다시 추정하지 않는다.
        // 순서: 마감 전(임박순) → 마감 지남(최근 마감순) → 마감일 없음. 지난 과제도 숨기지 않는다.
        Instant now = clock.instant();
        var upcoming = new ArrayList<LmsModels.Assignment>();
        var past = new ArrayList<LmsModels.Assignment>();
        var undated = new ArrayList<LmsModels.Assignment>();
        for (var item : lms.assignments(courseId).items()) {
            Instant due = parseInstant(item.dueAt());
            if (due == null) undated.add(item);
            else if (due.isBefore(now)) past.add(item);
            else upcoming.add(item);
        }
        Comparator<LmsModels.Assignment> byDue = Comparator.comparing(item -> parseInstant(item.dueAt()));
        upcoming.sort(byDue);
        past.sort(byDue.reversed());
        return Stream.of(upcoming, past, undated).flatMap(List::stream)
                .map(item -> new Notification("assignment-" + item.id(), NotificationType.ASSIGNMENT,
                        item.name(), null, item.dueAt(), item.lockAt(), null, null, item.htmlUrl(), null))
                .toList();
    }

    // LMS 날짜는 오프셋이 붙은 ISO 8601 문자열이다. 읽을 수 없는 값은 마감일 없음으로 둔다.
    private static Instant parseInstant(String value) {
        if (value == null) return null;
        try {
            return OffsetDateTime.parse(value).toInstant();
        } catch (DateTimeParseException exception) {
            return null;
        }
    }

    private List<Notification> materials(long courseId) {
        var result = new ArrayList<Notification>();
        var modules = lms.modules(courseId).items().stream()
                .sorted(Comparator.comparing(LmsModels.CourseModule::position, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
        for (var module : modules) {
            lms.moduleItems(courseId, module.id()).items().stream()
                    .filter(item -> MATERIAL_TYPES.contains(item.type()))
                    .sorted(Comparator.comparing(LmsModels.ModuleItem::position, Comparator.nullsLast(Comparator.naturalOrder())))
                    .map(item -> new Notification("material-" + item.id(), NotificationType.MATERIAL, item.title(),
                            null, null, null, item.type(), module.name(), item.htmlUrl(), null))
                    .forEach(result::add);
        }
        return result;
    }
}
