package com.aix.team03.community;

import com.aix.team03.auth.AuthUser;
import com.aix.team03.integrations.ai.TranslationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {"spring.config.import=", "app.lms.api-token="})
class CommunityTranslationControllerTests {
    private static final String PATH = "/api/v1/community/translations";

    @Autowired WebApplicationContext context;
    @MockitoBean TranslationService translations;
    MockMvc mvc;

    @BeforeEach
    void setUp() { mvc = MockMvcBuilders.webAppContextSetup(context).build(); }

    private MockHttpSession signedIn() {
        var session = new MockHttpSession();
        // AuthSessions.USER: 로그인 후 서버 세션에 저장되는 사용자 속성
        session.setAttribute("nest.user", new AuthUser("google-sub", "student@example.com"));
        return session;
    }

    private ResultActions translate(MockHttpSession session, String json) throws Exception {
        var request = post(PATH).contentType(MediaType.APPLICATION_JSON).content(json);
        return mvc.perform(session == null ? request : request.session(session));
    }

    @Test
    void anonymousUserCannotRequestTranslation() throws Exception {
        translate(null, "{\"text\":\"안녕하세요\",\"targetLanguage\":\"en\"}")
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTH_REQUIRED"));
        verifyNoInteractions(translations);
    }

    @Test
    void translatesIntoTheRequestedLanguageName() throws Exception {
        when(translations.translate("책상 팝니다", "장터 게시글 제목", "English"))
                .thenReturn(new TranslationService.Result("Desk for sale", false));

        translate(signedIn(), """
                {"text":"책상 팝니다","targetLanguage":"en","sourceLanguage":"ko","context":"장터 게시글 제목"}
                """)
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.translatedText").value("Desk for sale"))
                .andExpect(jsonPath("$.targetLanguage").value("en"))
                .andExpect(jsonPath("$.cached").value(false));
    }

    @Test
    void chineseIsTranslatedAsSimplifiedChinese() throws Exception {
        when(translations.translate("질문 있어요", null, "Simplified Chinese"))
                .thenReturn(new TranslationService.Result("我有问题", true));

        translate(signedIn(), "{\"text\":\"질문 있어요\",\"targetLanguage\":\"zh\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.translatedText").value("我有问题"))
                .andExpect(jsonPath("$.cached").value(true));
    }

    @Test
    void sameLanguageReturnsOriginalWithoutCallingGemini() throws Exception {
        translate(signedIn(), "{\"text\":\"원문 그대로\",\"targetLanguage\":\"ko\",\"sourceLanguage\":\"ko\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.translatedText").value("원문 그대로"))
                .andExpect(jsonPath("$.cached").value(false));
        verifyNoInteractions(translations);
    }

    @Test
    void rejectsInvalidInputBeforeCallingGemini() throws Exception {
        translate(signedIn(), "{\"text\":\"   \",\"targetLanguage\":\"en\"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
                .andExpect(jsonPath("$.fields.text").exists());
        translate(signedIn(), "{\"text\":\"" + "가".repeat(3001) + "\",\"targetLanguage\":\"en\"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.text").exists());
        translate(signedIn(), "{\"text\":\"안녕하세요\",\"targetLanguage\":\"ja\"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.targetLanguage").exists());
        translate(signedIn(), "{\"text\":\"안녕하세요\",\"targetLanguage\":\"en\",\"sourceLanguage\":\"fr\"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.sourceLanguage").exists());
        verifyNoInteractions(translations);
    }

    @Test
    void translationFailureHidesProviderDetails() throws Exception {
        when(translations.translate(any(), any(), any()))
                .thenThrow(new IllegalStateException("Gemini API 키가 설정되지 않았습니다."));

        translate(signedIn(), "{\"text\":\"안녕하세요\",\"targetLanguage\":\"en\"}")
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.code").value("TRANSLATION_FAILED"))
                .andExpect(content().string(not(containsString("Gemini"))));
    }
}
