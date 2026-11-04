package com.aix.team03.notices;

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
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// 학교 사이트에 접속하지 않도록 수집을 끄고 샘플 공지로 확인한다.
@SpringBootTest(properties = {"spring.config.import=", "app.lms.api-token=", "NOTICE_COLLECTION_ENABLED=false"})
class NoticeControllerTests {
    private static final String PATH = "/api/v1/notices";
    private static final String UNDERGRADUATE =
            "{\"nationality\":\"VN\",\"visaType\":\"D-2\",\"degree\":\"BACHELOR\",\"year\":\"2\",\"collegeId\":\"computing\"}";

    @Autowired WebApplicationContext context;
    @MockitoBean TranslationService translations;
    MockMvc mvc;

    @BeforeEach
    void setUp() { mvc = MockMvcBuilders.webAppContextSetup(context).build(); }

    private MockHttpSession signedIn() {
        var session = new MockHttpSession();
        // AuthSessions.USER, AuthSessions.CSRF: 로그인 후 서버 세션에 저장되는 속성
        session.setAttribute("nest.user", new AuthUser("google-sub", "student@example.com"));
        session.setAttribute("nest.csrf", "csrf-fixture");
        return session;
    }

    private ResultActions send(String path, String json) throws Exception {
        return mvc.perform(post(path).session(signedIn()).header("X-CSRF-Token", "csrf-fixture")
                .contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private ResultActions search(String query, String json) throws Exception {
        return send(PATH + "/search" + query, json);
    }

    private ResultActions translate(String noticeId, String json) throws Exception {
        return send(PATH + "/" + noticeId + "/translations", json);
    }

    private void translationsSucceed() {
        when(translations.translate(any(), any(), eq("English"))).thenAnswer(call ->
                new TranslationService.Result("en:" + call.getArgument(0), false));
    }

    @Test
    void anonymousUserCannotReadNotices() throws Exception {
        for (var path : new String[] {PATH + "/search", PATH + "/univ-001/view"}) {
            mvc.perform(post(path))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code").value("AUTH_REQUIRED"));
        }
    }

    @Test
    void listsSampleNoticesWithoutDetailFields() throws Exception {
        search("", "{\"collegeId\":\"computing\"}")
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.items", hasSize(6)))
                .andExpect(jsonPath("$.truncated").value(false))
                .andExpect(jsonPath("$.items[*].sample", everyItem(is(true))))
                .andExpect(jsonPath("$.items[0].noticeId").exists())
                .andExpect(jsonPath("$.items[0].matchReasons").isArray())
                .andExpect(jsonPath("$.items[0].originalContent").doesNotExist());
    }

    @Test
    void filtersBySource() throws Exception {
        search("?source=INTERNATIONAL", "{}")
                .andExpect(jsonPath("$.items", hasSize(2)))
                .andExpect(jsonPath("$.items[*].source", everyItem(is("INTERNATIONAL"))));
    }

    @Test
    void matchesNoticesAgainstTheProfileInTheBody() throws Exception {
        search("?match=APPLICABLE", UNDERGRADUATE)
                .andExpect(jsonPath("$.items[*].noticeId", containsInAnyOrder("intl-001", "intl-002", "univ-001")));
        search("?match=NEEDS_REVIEW", UNDERGRADUATE)
                .andExpect(jsonPath("$.items[*].noticeId", containsInAnyOrder("univ-002", "coll-002")));
    }

    @Test
    void differentProfileGetsDifferentResult() throws Exception {
        search("?match=APPLICABLE", "{\"nationality\":\"VN\",\"visaType\":\"D-2\",\"degree\":\"MASTER\",\"year\":\"1\"}")
                .andExpect(jsonPath("$.items[*].noticeId", containsInAnyOrder("intl-001", "intl-002")));
    }

    @Test
    void mismatchedNoticeStaysInAllTargetsList() throws Exception {
        search("", UNDERGRADUATE)
                .andExpect(jsonPath("$.items", hasSize(6)))
                .andExpect(jsonPath("$.items[?(@.noticeId == 'coll-001')].matchStatus", hasItem("NOT_APPLICABLE")));
    }

    @Test
    void missingOrFreeTextProfileStaysVisibleAsNeedsReview() throws Exception {
        for (var body : new String[] {"{}", "{\"nationality\":\"베트남\",\"degree\":\"학부생\",\"year\":\"2학년\"}"}) {
            search("?match=NEEDS_REVIEW", body)
                    .andExpect(jsonPath("$.items", hasSize(4)))
                    .andExpect(jsonPath("$.items[*].matchStatus", everyItem(is("NEEDS_REVIEW"))));
        }
        search("?match=APPLICABLE", "{}").andExpect(status().isOk()).andExpect(jsonPath("$.items", hasSize(0)));
    }

    @Test
    void profileBodyIsOptional() throws Exception {
        mvc.perform(post(PATH + "/search").session(signedIn()).header("X-CSRF-Token", "csrf-fixture"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(4)));
    }

    @Test
    void profileIsNotAcceptedInTheUrl() throws Exception {
        mvc.perform(get(PATH).session(signedIn()).param("nationality", "VN"))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void rejectsInvalidInput() throws Exception {
        search("?source=LIBRARY", "{}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
                .andExpect(jsonPath("$.fields.source").exists());
        search("?match=NOT_APPLICABLE", "{}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.match").exists());
        search("", "{")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }

    @Test
    void longProfileValueIsTreatedAsMissingInsteadOfBlockingNotices() throws Exception {
        var body = "{\"nationality\":\"" + "가".repeat(51) + "\"}";
        search("?match=NEEDS_REVIEW", body)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(4)));
        send(PATH + "/univ-001/view", body)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.matchStatus").value("NEEDS_REVIEW"));
    }

    @Test
    void listsApplicableFirstThenByNearestDeadline() throws Exception {
        search("", UNDERGRADUATE)
                .andExpect(jsonPath("$.items[*].noticeId",
                        contains("univ-001", "intl-001", "intl-002", "univ-002", "coll-002", "coll-001")))
                .andExpect(jsonPath("$.items[*].matchStatus", contains("APPLICABLE", "APPLICABLE", "APPLICABLE",
                        "NEEDS_REVIEW", "NEEDS_REVIEW", "NOT_APPLICABLE")));
    }

    @Test
    void collegeNoticesAreShownOnlyToThatCollege() throws Exception {
        search("?source=COLLEGE", "{\"collegeId\":\"computing\"}")
                .andExpect(jsonPath("$.items[*].noticeId", containsInAnyOrder("coll-001", "coll-002")));
        search("?source=COLLEGE", "{\"collegeId\":\"pharmacy\"}")
                .andExpect(jsonPath("$.items", hasSize(0)));
        search("", "{}")
                .andExpect(jsonPath("$.items[*].noticeId", containsInAnyOrder("intl-001", "intl-002", "univ-001", "univ-002")));
        send(PATH + "/coll-001/view", "{\"collegeId\":\"pharmacy\"}")
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOTICE_NOT_FOUND"));
        send(PATH + "/coll-001/view", "{}")
                .andExpect(status().isNotFound());
        send(PATH + "/coll-001/view", "{\"collegeId\":\"computing\"}")
                .andExpect(status().isOk());
    }

    @Test
    void otherCollegeNoticeIsNotTranslated() throws Exception {
        translationsSucceed();

        translate("coll-001", "{\"targetLanguage\":\"en\",\"collegeId\":\"pharmacy\"}")
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOTICE_NOT_FOUND"));
        translate("coll-001", "{\"targetLanguage\":\"en\"}")
                .andExpect(status().isNotFound());
        verifyNoInteractions(translations);
        translate("coll-001", "{\"targetLanguage\":\"en\",\"collegeId\":\"computing\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.translationStatus").value("SUCCEEDED"));
    }

    @Test
    void returnsNoticeDetail() throws Exception {
        send(PATH + "/univ-001/view", UNDERGRADUATE)
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.noticeId").value("univ-001"))
                .andExpect(jsonPath("$.matchStatus").value("APPLICABLE"))
                .andExpect(jsonPath("$.matchReasons").isNotEmpty())
                .andExpect(jsonPath("$.deadline").value("2026-11-20T17:00:00+09:00"))
                .andExpect(jsonPath("$.targetConditions.visaTypes[0]").value("D-2"))
                .andExpect(jsonPath("$.actions[0].id").value("a1"))
                .andExpect(jsonPath("$.actions[0].completed").doesNotExist())
                .andExpect(jsonPath("$.documents", hasSize(3)))
                .andExpect(jsonPath("$.originalLanguage").value("ko"))
                .andExpect(jsonPath("$.savedScheduleId", nullValue()))
                .andExpect(jsonPath("$.sample").value(true));
    }

    @Test
    void notAnalyzedNoticeKeepsEmptyValues() throws Exception {
        send(PATH + "/coll-002/view", UNDERGRADUATE)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.analysisStatus").value("NOT_ANALYZED"))
                .andExpect(jsonPath("$.matchStatus").value("NEEDS_REVIEW"))
                .andExpect(jsonPath("$.deadline", nullValue()))
                .andExpect(jsonPath("$.target", nullValue()))
                .andExpect(jsonPath("$.targetConditions", nullValue()))
                .andExpect(jsonPath("$.actions", hasSize(0)));
    }

    @Test
    void unknownNoticeIsNotFound() throws Exception {
        send(PATH + "/missing/view", "{}")
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOTICE_NOT_FOUND"))
                .andExpect(jsonPath("$.fields").isEmpty());
        translate("missing", "{\"targetLanguage\":\"en\"}")
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOTICE_NOT_FOUND"));
        verifyNoInteractions(translations);
    }

    @Test
    void translatesEveryField() throws Exception {
        translationsSucceed();

        translate("univ-001", "{\"targetLanguage\":\"en\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.noticeId").value("univ-001"))
                .andExpect(jsonPath("$.translationStatus").value("SUCCEEDED"))
                .andExpect(jsonPath("$.retryable").value(false))
                .andExpect(jsonPath("$.message", nullValue()))
                .andExpect(jsonPath("$.translated.title").value("en:외국인 학부생 체류 서류 제출 안내"))
                .andExpect(jsonPath("$.translated.target").value("en:D-2 비자 학부 재학생"))
                .andExpect(jsonPath("$.translated.actions[0].id").value("a1"))
                .andExpect(jsonPath("$.translated.actions[0].text").value("en:요청된 서류 3종 준비"))
                .andExpect(jsonPath("$.translated.documents[0]").value("en:여권 사본"))
                .andExpect(jsonPath("$.translated.content", containsString("en:[샘플]")));
    }

    @Test
    void missingTargetIsNotSentToGemini() throws Exception {
        translationsSucceed();

        translate("coll-002", "{\"targetLanguage\":\"en\",\"collegeId\":\"computing\"}")
                .andExpect(jsonPath("$.translationStatus").value("SUCCEEDED"))
                .andExpect(jsonPath("$.translated.target", nullValue()));
        verify(translations, never()).translate(eq(null), any(), any());
    }

    @Test
    void sameLanguageReturnsOriginalWithoutCallingGemini() throws Exception {
        translate("univ-001", "{\"targetLanguage\":\"ko\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.translationStatus").value("SUCCEEDED"))
                .andExpect(jsonPath("$.translated.title").value("외국인 학부생 체류 서류 제출 안내"));
        verifyNoInteractions(translations);
    }

    @Test
    void failedTranslationIsRetryableAndHidesProviderDetails() throws Exception {
        when(translations.translate(any(), any(), any()))
                .thenThrow(new IllegalStateException("Gemini API 키가 설정되지 않았습니다."));

        translate("univ-001", "{\"targetLanguage\":\"en\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.translationStatus").value("FAILED"))
                .andExpect(jsonPath("$.translated", nullValue()))
                .andExpect(jsonPath("$.retryable").value(true))
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(content().string(not(containsString("Gemini"))));
    }

    @Test
    void partialTranslationFailsThenSucceedsOnRetry() throws Exception {
        when(translations.translate(any(), any(), eq("English")))
                .thenReturn(new TranslationService.Result("en:title", false))
                .thenThrow(new IllegalStateException("quota"))
                .thenAnswer(call -> new TranslationService.Result("en:" + call.getArgument(0), false));

        translate("univ-001", "{\"targetLanguage\":\"en\"}")
                .andExpect(jsonPath("$.translationStatus").value("FAILED"))
                .andExpect(jsonPath("$.translated", nullValue()));
        translate("univ-001", "{\"targetLanguage\":\"en\"}")
                .andExpect(jsonPath("$.translationStatus").value("SUCCEEDED"))
                .andExpect(jsonPath("$.translated.actions[1].id").value("a2"));
    }

    @Test
    void rejectsUnsupportedLanguageBeforeCallingGemini() throws Exception {
        translate("univ-001", "{\"targetLanguage\":\"ja\"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
                .andExpect(jsonPath("$.fields.targetLanguage").exists());
        translate("univ-001", "{}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.targetLanguage").exists());
        verifyNoInteractions(translations);
    }
}
