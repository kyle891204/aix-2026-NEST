package com.aix.team03.notices;

import com.aix.team03.integrations.ai.TranslationService;
import com.aix.team03.matching.MatchingModels.MatchResult;
import com.aix.team03.matching.MatchingModels.StudentProfile;
import com.aix.team03.matching.NoticeMatcher;
import com.aix.team03.notices.NoticeController.MatchFilter;
import com.aix.team03.notices.NoticeController.NoticeDetail;
import com.aix.team03.notices.NoticeController.NoticeSummary;
import com.aix.team03.notices.NoticeController.TranslatedNotice;
import com.aix.team03.notices.NoticeController.TranslationResponse;
import com.aix.team03.notices.NoticeModels.Action;
import com.aix.team03.notices.NoticeModels.Notice;
import com.aix.team03.notices.NoticeModels.Source;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class NoticeService {
    private static final Logger log = LoggerFactory.getLogger(NoticeService.class);
    // Gemini에는 언어 코드 대신 이름을 전달한다. zh는 간체로 번역한다.
    private static final Map<String, String> LANGUAGE_NAMES =
            Map.of("ko", "Korean", "en", "English", "zh", "Simplified Chinese");
    private static final String TRANSLATION_FAILED = "번역하지 못했습니다. 원문을 확인하거나 다시 시도해 주세요.";

    // 해당 → 확인 필요 → 해당 안 됨 순으로, 같은 상태 안에서는 마감 임박순으로 보여준다. 마감이 없으면 뒤로 간다.
    private static final Comparator<NoticeSummary> LIST_ORDER = Comparator
            .comparing((NoticeSummary summary) -> summary.matchStatus().ordinal())
            .thenComparing(summary -> deadline(summary.deadline()), Comparator.nullsLast(Comparator.naturalOrder()));

    private final NoticeRepository notices;
    private final NoticeMatcher matcher;
    private final TranslationService translations;

    public NoticeService(NoticeRepository notices, NoticeMatcher matcher, TranslationService translations) {
        this.notices = notices;
        this.matcher = matcher;
        this.translations = translations;
    }

    public List<NoticeSummary> search(Source source, MatchFilter match, StudentProfile profile, String collegeId) {
        return notices.findAll().stream()
                .filter(notice -> visibleTo(notice, collegeId))
                .filter(notice -> source == null || notice.source() == source)
                .map(notice -> summary(notice, profile))
                .filter(summary -> match == null || summary.matchStatus().name().equals(match.name()))
                .sorted(LIST_ORDER)
                .toList();
    }

    public NoticeDetail view(String noticeId, StudentProfile profile, String collegeId) {
        var notice = find(noticeId);
        // 다른 단과대 공지는 주소로 직접 열어도 없는 공지로 처리한다.
        if (!visibleTo(notice, collegeId)) throw new NoticeNotFoundException();
        var result = match(notice, profile);
        // savedScheduleId는 #10 일정 서비스가 생기면 채운다.
        return new NoticeDetail(notice.noticeId(), notice.source(), notice.sourceName(), notice.category(),
                notice.title(), notice.postedAt(), notice.analysisStatus(), result.status(), result.reasons(),
                notice.deadline(), notice.target(), notice.targetConditions(), notice.actions(), notice.documents(),
                notice.attachments(), notice.originalContent(), notice.originalLanguage(), notice.sourceUrl(), null,
                notice.sample());
    }

    public TranslationResponse translate(String noticeId, String targetLanguage) {
        var notice = find(noticeId);
        try {
            // 번역된 필드는 TranslationService 캐시에 남으므로 재시도하면 실패한 필드부터 이어서 호출한다.
            return new TranslationResponse(noticeId, targetLanguage, "SUCCEEDED",
                    translated(notice, targetLanguage), false, null);
        } catch (RuntimeException exception) {
            // 키 미설정·응답 오류·네트워크 실패의 원인은 로그에만 남기고 화면에는 재시도를 안내한다.
            log.warn("Notice translation failed: {}", exception.toString());
            return new TranslationResponse(noticeId, targetLanguage, "FAILED", null, true, TRANSLATION_FAILED);
        }
    }

    private TranslatedNotice translated(Notice notice, String language) {
        return new TranslatedNotice(
                translate(notice, notice.title(), "공지 제목", language),
                translate(notice, notice.target(), "공지 대상", language),
                notice.actions().stream().map(action -> new Action(action.id(),
                        translate(notice, action.text(), "공지에서 해야 할 일", language))).toList(),
                notice.documents().stream().map(document -> translate(notice, document, "준비 서류", language)).toList(),
                translate(notice, notice.originalContent(), "공지 원문", language));
    }

    private String translate(Notice notice, String text, String context, String language) {
        // 원문과 같은 언어면 Gemini를 호출하지 않는다.
        if (text == null || language.equals(notice.originalLanguage())) return text;
        return translations.translate(text, context, LANGUAGE_NAMES.get(language)).translatedText();
    }

    private NoticeSummary summary(Notice notice, StudentProfile profile) {
        var result = match(notice, profile);
        return new NoticeSummary(notice.noticeId(), notice.source(), notice.sourceName(), notice.category(),
                notice.title(), notice.postedAt(), notice.analysisStatus(), result.status(), result.reasons(),
                notice.deadline(), notice.sample());
    }

    /** ERICA 전체 공지는 모두에게, 단과대 공지는 프로필의 단과대가 같은 학생에게만 보여준다. */
    private static boolean visibleTo(Notice notice, String collegeId) {
        return notice.collegeId() == null || notice.collegeId().equals(collegeId);
    }

    private MatchResult match(Notice notice, StudentProfile profile) {
        return matcher.match(notice.targetConditions(), notice.analysisStatus(), profile);
    }

    private Notice find(String noticeId) {
        return notices.findById(noticeId).orElseThrow(NoticeNotFoundException::new);
    }

    private static Instant deadline(String value) {
        try {
            return value == null ? null : OffsetDateTime.parse(value).toInstant();
        } catch (DateTimeParseException exception) {
            return null;
        }
    }

    static class NoticeNotFoundException extends RuntimeException {}
}
