package com.aix.team03.notices;

import com.aix.team03.integrations.ai.TranslationService;
import com.aix.team03.matching.NoticeMatcher;
import com.aix.team03.notices.NoticeModels.Notice;
import com.aix.team03.notices.NoticeModels.Source;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/** 자동 테스트용: 긴 공지 본문을 번역할 때 Gemini에 보내는 길이를 검사한다. */
class NoticeServiceTests {
    private final NoticeRepository notices = mock(NoticeRepository.class);
    private final TranslationService translations = mock(TranslationService.class);
    private final NoticeService service = new NoticeService(notices, new NoticeMatcher(), translations,
            new NoticeAnalyses(mock(NoticeAnalysisClient.class)));

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
}
