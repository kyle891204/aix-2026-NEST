package com.aix.team03.community;

import com.aix.team03.auth.AuthUser;
import com.aix.team03.integrations.ai.BatchTranslationService;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {"spring.config.import=", "app.lms.api-token=", "app.auth.demo-guest=false"})
class BatchTranslationControllerTests {
    static final String PATH = "/api/v1/community/translations/batch";
    static final String BODY = """
            {"targetLanguage":"en","items":[{"id":"free:p:title","text":"안녕하세요","sourceLanguage":"ko","context":"게시글"}]}
            """;
    @Autowired WebApplicationContext context;
    @MockitoBean BatchTranslationService translations;
    MockMvc mvc;

    @BeforeEach void setup() { mvc = MockMvcBuilders.webAppContextSetup(context).build(); }
    MockHttpSession session() {
        var session = new MockHttpSession();
        session.setAttribute("nest.user", new AuthUser("test-user", "test@example.invalid"));
        session.setAttribute("nest.csrf", "test-csrf");
        return session;
    }

    @Test void requiresExistingAuthenticationAndCsrfProtection() throws Exception {
        mvc.perform(post(PATH).contentType(MediaType.APPLICATION_JSON).content(BODY)).andExpect(status().isUnauthorized());
        mvc.perform(post(PATH).session(session()).contentType(MediaType.APPLICATION_JSON).content(BODY)).andExpect(status().isForbidden());
        verifyNoInteractions(translations);
    }

    @Test void returnsItemStatusesWithoutChangingTheSingleItemEndpoint() throws Exception {
        when(translations.translate(anyList(), eq("en"))).thenReturn(List.of(
                new BatchTranslationService.Result("free:p:title", "SUCCEEDED", "Hello", true, false)));
        mvc.perform(post(PATH).session(session()).header("X-CSRF-Token", "test-csrf")
                .contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.targetLanguage").value("en"))
                .andExpect(jsonPath("$.items[0].translatedText").value("Hello"))
                .andExpect(jsonPath("$.items[0].cached").value(true));
    }

    @Test void rejectsMalformedOrOversizedBatchesBeforeCallingProvider() throws Exception {
        String item = "{\"id\":\"a\",\"text\":\"원문\",\"sourceLanguage\":\"ko\"}";
        for (var body : List.of(
                "{\"targetLanguage\":\"en\",\"items\":[]}",
                "{\"targetLanguage\":\"en\",\"items\":[null]}",
                "{\"targetLanguage\":\"en\",\"items\":[" + item + "," + item + "]}",
                BODY.replace("안녕하세요", "x".repeat(3001)),
                BODY.replace("\"ko\"", "\"fr\""),
                BODY.replace("\"en\"", "\"ja\""),
                "{\"targetLanguage\":\"en\",\"items\":[" + String.join(",", java.util.Collections.nCopies(101, item)) + "]}")) {
            mvc.perform(post(PATH).session(session()).header("X-CSRF-Token", "test-csrf")
                    .contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
        }
        verifyNoInteractions(translations);
    }
}
