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
    // 커뮤니티 번역과 같은 길이 제한이다.
    static final int MAX_CONTENT = 3000;
    private static final Map<String, String> CONTENT_CUT = Map.of(
            "ko", "(본문이 길어 앞부분만 번역했어요. 나머지는 원문에서 확인해 주세요.)",
            "en", "(This notice is long, so only the first part was translated. Please check the original for the rest.)",
            "zh", "（公告较长，仅翻译了前半部分。其余内容请查看原文。）");

    // 해당 → 확인 필요 → 해당 안 됨 순으로, 같은 상태 안에서는 마감 임박순으로 보여준다. 마감이 없으면 뒤로 간다.
    private static final Comparator<NoticeSummary> LIST_ORDER = Comparator
            .comparing((NoticeSummary summary) -> summary.matchStatus().ordinal())
            .thenComparing(summary -> deadline(summary.deadline()), Comparator.nullsLast(Comparator.naturalOrder()));

    private final NoticeRepository notices;
    private final NoticeMatcher matcher;
    private final TranslationService translations;
    private final NoticeAnalyses analyses;

    public NoticeService(NoticeRepository notices, NoticeMatcher matcher, TranslationService translations,
            NoticeAnalyses analyses) {
        this.notices = notices;
        this.matcher = matcher;
        this.translations = translations;
        this.analyses = analyses;
    }

    public List<NoticeSummary> search(Source source, MatchFilter match, StudentProfile profile, String collegeId) {
        return visibleNotices(collegeId).stream()
                .filter(notice -> source == null || notice.source() == source)
                .map(notice -> summary(notice, profile))
                .filter(summary -> match == null || summary.matchStatus().name().equals(match.name()))
                .sorted(LIST_ORDER)
                .toList();
    }

    /**
     * 이 학생이 볼 수 있는 공지를 이미 분석한 결과와 함께 돌려준다. 대시보드(#6)도 같은 공지로 판별한다.
     * 목록은 Gemini를 기다리지 않도록 이미 분석한 공지만 분석 결과로 판별한다.
     */
    public List<Notice> visibleNotices(String collegeId) {
        return notices.findAll().stream()
                .filter(notice -> visibleTo(notice, collegeId))
                .map(analyses::cached)
                .toList();
    }

    public NoticeDetail view(String noticeId, StudentProfile profile, String collegeId) {
        var notice = find(noticeId);
        // 다른 단과대 공지는 주소로 직접 열어도 없는 공지로 처리한다.
        if (!visibleTo(notice, collegeId)) throw new NoticeNotFoundException();
        // 처음 여는 실제 공지는 여기서 분석한다. 실패하면 분석 전 공지를 그대로 보여준다.
        notice = analyses.analyze(notice);
        var result = match(notice, profile);
        // savedScheduleId는 #10 일정 서비스가 생기면 채운다.
        return new NoticeDetail(notice.noticeId(), notice.source(), notice.sourceName(), notice.category(),
                notice.title(), notice.postedAt(), notice.analysisStatus(), result.status(), result.reasons(),
                notice.deadline(), notice.target(), notice.targetConditions(), notice.actions(), notice.documents(),
                notice.attachments(), notice.originalContent(), notice.originalLanguage(), notice.sourceUrl(), null,
                notice.sample());
    }

    public TranslationResponse translate(String noticeId, String targetLanguage, String collegeId) {
        var notice = find(noticeId);
        if (!visibleTo(notice, collegeId)) throw new NoticeNotFoundException();
        // 상세에 보이는 해야 할 일·서류와 같은 내용을 번역한다.
        notice = analyses.cached(notice);
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
                content(notice, language));
    }

    // 긴 원문은 앞부분만 번역하고 나머지는 원문에서 보도록 안내해 Gemini 비용과 대기 시간을 줄인다.
    private String content(Notice notice, String language) {
        var original = notice.originalContent();
        if (original == null || original.length() <= MAX_CONTENT || language.equals(notice.originalLanguage())) {
            return translate(notice, original, "공지 원문", language);
        }
        return translate(notice, original.substring(0, MAX_CONTENT), "공지 원문 앞부분", language)
                + "\n\n" + CONTENT_CUT.get(language);
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
