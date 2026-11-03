package com.aix.team03.integrations.school;

import com.aix.team03.integrations.school.SchoolNoticeModels.Detail;
import com.aix.team03.integrations.school.SchoolNoticeModels.SchoolNotice;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * 공개 공지 게시판의 첫 페이지와 각 글의 상세를 읽는다. 학교 사이트에 부담을 주지 않도록 게시판마다
 * 최근 글만 가져오고 요청 사이를 띄운다. 한 게시판이나 한 글이 실패해도 나머지는 계속 읽는다.
 */
@Component
public class SchoolNoticeCollector {
    private static final Logger log = LoggerFactory.getLogger(SchoolNoticeCollector.class);
    static final int NOTICES_PER_BOARD = 10;
    private static final String USER_AGENT = "Mozilla/5.0 (compatible; NEST-ERICA-student-project)";

    /** 테스트에서 네트워크 없이 HTML을 넣을 수 있게 분리한다. */
    public interface HtmlFetcher {
        Document fetch(String url) throws IOException;
    }

    private final List<SchoolBoard> boards;
    private final HtmlFetcher fetcher;
    private final long delayMillis;

    @Autowired
    public SchoolNoticeCollector(List<SchoolBoard> boards) {
        this(boards, url -> Jsoup.connect(url).userAgent(USER_AGENT).timeout(10_000).get(), 300);
    }

    SchoolNoticeCollector(List<SchoolBoard> boards, HtmlFetcher fetcher, long delayMillis) {
        this.boards = boards;
        this.fetcher = fetcher;
        this.delayMillis = delayMillis;
    }

    public List<SchoolNotice> collect() {
        var notices = new ArrayList<SchoolNotice>();
        for (var board : boards) {
            try {
                var entries = board.parseList(fetch(board.listUrl())).stream().limit(NOTICES_PER_BOARD).toList();
                for (var entry : entries) {
                    var detail = detail(board, entry.url());
                    var postedAt = entry.postedAt() != null ? entry.postedAt() : detail.postedAt();
                    notices.add(new SchoolNotice(board.key(), board.kind(), board.name(), board.collegeId(), entry.id(),
                            entry.label(),
                            entry.title(), postedAt, entry.url(), detail.content(), detail.attachments()));
                }
            } catch (IOException | RuntimeException exception) {
                log.warn("School board {} could not be read: {}", board.key(), exception.toString());
            }
        }
        return notices;
    }

    // 상세를 못 읽은 글도 목록 정보와 원문 링크로 보여줄 수 있게 빈 상세로 둔다.
    private Detail detail(SchoolBoard board, String url) {
        try {
            return board.parseDetail(fetch(url));
        } catch (IOException | RuntimeException exception) {
            log.warn("School notice {} could not be read: {}", url, exception.toString());
            return new Detail("", null, List.of());
        }
    }

    private Document fetch(String url) throws IOException {
        if (delayMillis > 0) {
            try {
                Thread.sleep(delayMillis);
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                throw new IOException("interrupted", exception);
            }
        }
        return fetcher.fetch(url);
    }
}
