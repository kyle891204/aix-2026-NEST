package com.aix.team03.notices;

import com.aix.team03.auth.AuthUser;
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
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** 학교 공지를 하나도 읽지 못했을 때 전체공지와 대시보드가 같은 503 안내를 주는지 확인한다. */
@SpringBootTest(properties = {"spring.config.import=", "app.lms.api-token="})
class NoticeSourceUnavailableTests {
    private static final String TOKEN = "csrf-fixture";

    @Autowired WebApplicationContext context;
    @MockitoBean CollectedNoticeRepository notices;
    MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.webAppContextSetup(context).build();
        when(notices.findAll()).thenThrow(new NoticeSourceUnavailableException());
    }

    @Test
    void noticeListAndDashboardBothAnswerServiceUnavailable() throws Exception {
        for (String path : new String[] {"/api/v1/notices/search", "/api/v1/dashboard"}) {
            var session = new MockHttpSession();
            session.setAttribute("nest.user", new AuthUser("google-sub", "student@example.com"));
            session.setAttribute("nest.csrf", TOKEN);
            mvc.perform(post(path).session(session).header("X-CSRF-Token", TOKEN)
                            .contentType(MediaType.APPLICATION_JSON).content("{}"))
                    .andExpect(status().isServiceUnavailable())
                    .andExpect(jsonPath("$.code").value("NOTICE_SOURCE_UNAVAILABLE"))
                    .andExpect(jsonPath("$.message").value("학교 공지를 불러오지 못했어요. 잠시 후 다시 시도해 주세요."));
        }
    }
}
