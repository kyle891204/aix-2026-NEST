package com.aix.team03.notices;

import com.aix.team03.integrations.school.SchoolNoticeModels.SchoolNotice;
import com.aix.team03.matching.MatchingModels.AnalysisStatus;
import com.aix.team03.matching.MatchingModels.TargetConditions;
import com.aix.team03.notices.NoticeModels.Attachment;
import com.aix.team03.notices.NoticeModels.Category;
import com.aix.team03.notices.NoticeModels.Notice;
import com.aix.team03.notices.NoticeModels.Source;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * 게시판에서 읽은 공지를 제품 공지로 바꾼다. 아직 AI 분석 전이라 대상 조건은 게시판이 붙인 분류에서
 * 확실한 것만 쓴다. "학사"는 학사과정이 아니라 학사 행정이라는 뜻이라 학위과정 조건으로 쓰지 않는다.
 */
final class CollectedNotices {
    static final String MISSING_CONTENT = "본문이 이미지나 첨부파일로 되어 있어요. 원문에서 확인해 주세요.";
    static final String LOADING_CONTENT = "본문을 학교 홈페이지에서 불러오는 중이에요. 잠시 후 다시 열어 주세요.";
    static final String FAILED_CONTENT = "본문을 학교 홈페이지에서 읽지 못했어요. 원문에서 확인해 주세요.";

    private static final Map<String, List<String>> DEGREE_LABELS = Map.of(
            "대학원", List.of("MASTER", "DOCTORAL"),
            "학부", List.of("BACHELOR"));

    // 앞에 있는 분류가 먼저 맞으면 그 분류로 정한다.
    private static final List<Map.Entry<Category, List<String>>> CATEGORY_WORDS = List.of(
            Map.entry(Category.VISA, List.of("비자", "체류", "외국인등록", "출입국", "사증")),
            Map.entry(Category.SCHOLARSHIP, List.of("장학")),
            Map.entry(Category.ACADEMIC, List.of("학사", "수업", "학적", "수강", "졸업", "계절학기", "교육과정")),
            Map.entry(Category.EVENT, List.of("행사", "특강", "설명회", "대회", "공모")));

    private CollectedNotices() {}

    static Notice toNotice(SchoolNotice school) {
        var label = school.label() == null ? "" : school.label().strip();
        var degrees = degrees(label);
        var conditions = degrees.isEmpty() ? null : new TargetConditions(null, null, degrees, null);
        var content = !school.detailRead() ? LOADING_CONTENT
                : school.detailFailed() ? FAILED_CONTENT
                : school.content().isBlank() ? MISSING_CONTENT : school.content();
        return new Notice(school.boardKey() + "-" + school.id(), Source.valueOf(school.kind().name()),
                school.boardName(), school.collegeId(), category(label, school.title()), title(label, school.title()),
                school.postedAt() == null ? null : school.postedAt().toString(),
                conditions == null ? AnalysisStatus.NOT_ANALYZED : AnalysisStatus.CONFIRMED,
                null, null, conditions, List.of(), List.of(),
                school.attachments().stream().map(file -> new Attachment(file.name(), file.url())).toList(),
                content, "ko", school.url(), false);
    }

    /** 본문 대신 넣은 안내 문구인지. 안내 문구는 분석하지 않는다. */
    static boolean isPlaceholder(String content) {
        return LOADING_CONTENT.equals(content) || FAILED_CONTENT.equals(content) || MISSING_CONTENT.equals(content);
    }

    /** 분류가 "ERICA 학부", "학부/대학원"처럼 여러 낱말일 수 있어 낱말마다 확인한다. */
    static List<String> degrees(String label) {
        return Arrays.stream(label.split("[\\s/·,]+"))
                .flatMap(word -> DEGREE_LABELS.getOrDefault(word, List.of()).stream())
                .distinct().toList();
    }

    /** 사이트에서 보이는 것처럼 분류를 제목 앞에 둔다. */
    static String title(String label, String title) {
        if (label.isEmpty() || title.startsWith("[" + label + "]")) return title;
        return "[" + label + "] " + title;
    }

    static Category category(String label, String title) {
        for (var text : List.of(label, title)) {
            for (var entry : CATEGORY_WORDS) {
                if (entry.getValue().stream().anyMatch(text::contains)) return entry.getKey();
            }
        }
        return Category.ETC;
    }
}
