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
        var result = new Collected();
        LmsIntegrationException firstFailure = null;
        int failedTypes = 0;
        for (var type : NotificationType.values()) {
            if (!types.contains(type)) continue;
            try {
                switch (type) {
                    case ANNOUNCEMENT -> announcements(courseId, start, end, result);
                    case ASSIGNMENT -> assignments(courseId, result);
                    case MATERIAL -> materials(courseId, result);
                }
            } catch (LmsIntegrationException exception) {
                // 한 유형이 실패해도 나머지는 보여주고, 실패한 유형은 화면에서 따로 안내한다.
                result.errors.add(new NotificationError(type, exception.getCode()));
                if (firstFailure == null) firstFailure = exception;
                failedTypes++;
            }
        }
        // 요청한 유형이 모두 실패하면 빈 목록 대신 LMS 오류를 그대로 돌려준다.
        if (firstFailure != null && failedTypes == types.size()) throw firstFailure;
        return new CourseNotifications(String.valueOf(courseId), List.copyOf(result.notifications),
                List.copyOf(result.errors), result.truncated);
    }

    /** 유형별 조회 결과를 모은다. truncated는 LMS 페이지 상한에 걸린 목록이 하나라도 있으면 true다. */
    private static final class Collected {
        final List<Notification> notifications = new ArrayList<>();
        final List<NotificationError> errors = new ArrayList<>();
        boolean truncated;

        <T> List<T> items(LmsModels.Page<T> page) {
            truncated |= page.truncated();
            return page.items();
        }
    }

    private void announcements(long courseId, LocalDate start, LocalDate end, Collected result) {
        // 게시일은 시간대를 반영한 실제 시각으로 비교한다.
        result.items(lms.announcements(courseId, start, end)).stream()
                .sorted(Comparator.comparing((LmsModels.Announcement item) -> parseInstant(item.postedAt()),
                        Comparator.nullsLast(Comparator.reverseOrder())))
                // LMS 공지에는 마감일 칸이 없어 본문에서 "~까지" 같은 날짜를 찾아 마감으로 쓴다(개인 일정 저장용).
                .map(item -> new Notification("announcement-" + item.id(), NotificationType.ANNOUNCEMENT,
                        item.title(), item.postedAt(), AnnouncementDeadlines.find(item.message(), item.postedAt()),
                        null, null, null, item.htmlUrl(), null))
                .forEach(result.notifications::add);
    }

    private void assignments(long courseId, Collected result) {
        // 마감일은 LMS가 사용자에게 적용한 값을 그대로 쓰고 다시 추정하지 않는다.
        // 순서: 마감 전(임박순) → 마감 지남(최근 마감순) → 마감일 없음. 지난 과제도 숨기지 않는다.
        Instant now = clock.instant();
        var upcoming = new ArrayList<LmsModels.Assignment>();
        var past = new ArrayList<LmsModels.Assignment>();
        var undated = new ArrayList<LmsModels.Assignment>();
        for (var item : result.items(lms.assignments(courseId))) {
            Instant due = parseInstant(item.dueAt());
            if (due == null) undated.add(item);
            else if (due.isBefore(now)) past.add(item);
            else upcoming.add(item);
        }
        Comparator<LmsModels.Assignment> byDue = Comparator.comparing(item -> parseInstant(item.dueAt()));
        upcoming.sort(byDue);
        past.sort(byDue.reversed());
        Stream.of(upcoming, past, undated).flatMap(List::stream)
                .map(item -> new Notification("assignment-" + item.id(), NotificationType.ASSIGNMENT,
                        item.name(), null, item.dueAt(), item.lockAt(), null, null, item.htmlUrl(), null))
                .forEach(result.notifications::add);
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

    private void materials(long courseId, Collected result) {
        var modules = result.items(lms.modules(courseId)).stream()
                .sorted(Comparator.comparing(LmsModels.CourseModule::position, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
        String failedCode = null;
        for (var module : modules) {
            try {
                result.items(lms.moduleItems(courseId, module.id())).stream()
                        .filter(item -> MATERIAL_TYPES.contains(item.type()))
                        .sorted(Comparator.comparing(LmsModels.ModuleItem::position, Comparator.nullsLast(Comparator.naturalOrder())))
                        .map(item -> new Notification("material-" + item.id(), NotificationType.MATERIAL, item.title(),
                                null, null, null, item.type(), module.name(), item.htmlUrl(), null))
                        .forEach(result.notifications::add);
            } catch (LmsIntegrationException exception) {
                // 한 주차의 항목 조회가 실패해도 이미 읽은 자료는 남기고, 학습자료 일부 실패로 한 번만 알린다.
                if (failedCode == null) failedCode = exception.getCode();
            }
        }
        if (failedCode != null) result.errors.add(new NotificationError(NotificationType.MATERIAL, failedCode));
    }
}
