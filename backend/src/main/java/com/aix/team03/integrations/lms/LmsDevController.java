package com.aix.team03.integrations.lms;

import java.time.LocalDate;
import java.time.ZoneId;
import org.springframework.context.annotation.Profile;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import static com.aix.team03.integrations.lms.LmsModels.*;

/** Reads using the configured demo owner's token. Not a multi-user auth API. */
@RestController
@Profile("!prod | lms-demo")
@RequestMapping("/api/v1/dev/lms")
public class LmsDevController {
    private final HanyangLmsClient client;
    public LmsDevController(HanyangLmsClient client) { this.client = client; }

    @GetMapping("/profile")
    public LmsModels.Profile profile() { return client.profile(); }

    @GetMapping("/courses")
    public Page<Course> courses() { return client.courses(); }

    @GetMapping("/courses/{courseId}")
    public CourseDetail course(@PathVariable long courseId) { return client.course(courseId); }

    @GetMapping("/courses/{courseId}/assignments")
    public Page<Assignment> assignments(@PathVariable long courseId) { return client.assignments(courseId); }

    @GetMapping("/courses/{courseId}/modules")
    public Page<CourseModule> modules(@PathVariable long courseId) { return client.modules(courseId); }

    @GetMapping("/courses/{courseId}/modules/{moduleId}/items")
    public Page<ModuleItem> moduleItems(@PathVariable long courseId, @PathVariable long moduleId) {
        return client.moduleItems(courseId, moduleId);
    }

    @GetMapping("/announcements")
    public Page<Announcement> announcements(@RequestParam long courseId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Seoul"));
        return client.announcements(courseId, startDate == null ? today.minusDays(90) : startDate,
                endDate == null ? today : endDate);
    }
}
