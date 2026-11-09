package com.aix.team03.notices;

import com.aix.team03.integrations.ai.TranslationService;
import com.aix.team03.matching.MatchingModels.AnalysisStatus;
import com.aix.team03.matching.MatchingModels.MatchStatus;
import com.aix.team03.matching.NoticeMatcher;
import com.aix.team03.notices.NoticeModels.Notice;
import com.aix.team03.notices.NoticeModels.Source;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/** 자동 테스트용: 긴 공지 본문을 번역할 때 Gemini에 보내는 길이와, 상세에서 분석한 결과가 목록에 이어지는지 검사한다. */
class NoticeServiceTests {
    private final NoticeRepository notices = mock(NoticeRepository.class);
    private final TranslationService translations = mock(TranslationService.class);
    private final NoticeAnalysisClient analysisClient = mock(NoticeAnalysisClient.class);
    private final NoticeService service = new NoticeService(notices, new NoticeMatcher(), translations,
            new NoticeAnalyses(analysisClient));

    private void noticeWithContent(String content) {
        when(notices.findById("long")).thenReturn(Optional.of(new Notice("long", Source.UNIVERSITY, "ERICA 학사",
                null, null, "제목", null, null, null, null, null, null, null, null, content, "ko", null, false)));
        when(translations.translate(any(), any(), eq("English")))
                .thenAnswer(call -> new TranslationService.Result("en:" + call.getArgument(0), false));
    }

    @Test
    void longContentIsTranslatedOnlyUpToTheLimit() {
        noticeWithContent("가".repeat(NoticeService.MAX_CONTENT) + "나".repeat(500));

        var content = service.translate("long", "en", null).translated().content();

        verify(translations).translate(eq("가".repeat(NoticeService.MAX_CONTENT)), anyString(), eq("English"));
        assertThat(content).startsWith("en:가").doesNotContain("나").contains("check the original");
    }

    @Test
    void shortContentIsTranslatedWhole() {
        noticeWithContent("가".repeat(NoticeService.MAX_CONTENT));

        var content = service.translate("long", "en", null).translated().content();

        assertThat(content).isEqualTo("en:" + "가".repeat(NoticeService.MAX_CONTENT));
    }

    @Test
    void listShowsAnalysisOnlyAfterDetailIsOpened() {
        var notice = new Notice("real", Source.UNIVERSITY, "ERICA 학사", null, null, "장학금 신청 안내", "2026-11-01",
                AnalysisStatus.NOT_ANALYZED, null, null, null, List.of(), List.of(), List.of(), "본문", "ko", null,
                false);
        when(notices.findAll()).thenReturn(List.of(notice));
        when(notices.findById("real")).thenReturn(Optional.of(notice));
        when(analysisClient.analyze(any(), any(), any())).thenReturn(new NoticeAnalysisClient.Analysis(
                "재학생", "2026-11-20", List.of("신청서 제출"), List.of(), List.of(), List.of(), List.of(), List.of(),
                true));

        // 상세를 열기 전 목록은 Gemini를 부르지 않고 분석 전 상태를 보여준다.
        assertThat(service.search(null, null, null, null)).singleElement()
                .satisfies(summary -> assertThat(summary.analysisStatus()).isEqualTo(AnalysisStatus.NOT_ANALYZED));
        verifyNoInteractions(analysisClient);

        var detail = service.view("real", null, null);
        assertThat(detail.analysisStatus()).isEqualTo(AnalysisStatus.CONFIRMED);
        assertThat(detail.deadline()).isEqualTo("2026-11-20T23:59:00+09:00");

        assertThat(service.search(null, null, null, null)).singleElement().satisfies(summary -> {
            assertThat(summary.analysisStatus()).isEqualTo(detail.analysisStatus());
            assertThat(summary.deadline()).isEqualTo(detail.deadline());
            assertThat(summary.matchStatus()).isEqualTo(MatchStatus.APPLICABLE);
        });
        verify(analysisClient, times(1)).analyze(any(), any(), any());
    }
}
