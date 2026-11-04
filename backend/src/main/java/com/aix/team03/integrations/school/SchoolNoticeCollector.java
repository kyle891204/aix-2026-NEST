package com.aix.team03.integrations.school;

import com.aix.team03.integrations.school.SchoolNoticeModels.Detail;
import com.aix.team03.integrations.school.SchoolNoticeModels.ListEntry;
import com.aix.team03.integrations.school.SchoolNoticeModels.SchoolNotice;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executors;
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

        /** 상세가 링크 없이 폼 전송으로만 열리는 게시판(LIONS칼리지)용. */
        default Document post(String url, Map<String, String> form) throws IOException {
            throw new IOException("POST is not supported: " + url);
        }
    }

    private static final HtmlFetcher JSOUP = new HtmlFetcher() {
        @Override
        public Document fetch(String url) throws IOException {
            return Jsoup.connect(url).userAgent(USER_AGENT).timeout(10_000).get();
        }

        @Override
        public Document post(String url, Map<String, String> form) throws IOException {
            return Jsoup.connect(url).userAgent(USER_AGENT).timeout(10_000).data(form).post();
        }
    };

    private final List<SchoolBoard> boards;
    private final HtmlFetcher fetcher;
    private final long delayMillis;

    @Autowired
    public SchoolNoticeCollector(List<SchoolBoard> boards) {
        this(boards, JSOUP, 300);
    }

    SchoolNoticeCollector(List<SchoolBoard> boards, HtmlFetcher fetcher, long delayMillis) {
        this.boards = boards;
        this.delayMillis = delayMillis;
        // 상세를 폼으로 여는 게시판도 요청 사이를 똑같이 띄우도록 모든 요청을 여기로 모은다.
        this.fetcher = new HtmlFetcher() {
            @Override
            public Document fetch(String url) throws IOException {
                pause();
                return fetcher.fetch(url);
            }

            @Override
            public Document post(String url, Map<String, String> form) throws IOException {
                pause();
                return fetcher.post(url, form);
            }
        };
    }

    // 게시판마다 사이트가 달라 동시에 읽는다. 한 게시판 안에서는 요청 사이를 띄우므로 사이트마다 부담은 그대로다.
    public List<SchoolNotice> collect() {
        if (boards.isEmpty()) return List.of();
        try (var pool = Executors.newFixedThreadPool(boards.size())) {
            var results = boards.stream().map(board -> pool.submit(() -> collect(board))).toList();
            var notices = new ArrayList<SchoolNotice>();
            for (var result : results) {
                try {
                    notices.addAll(result.get());
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    break;
                } catch (ExecutionException exception) {
                    log.warn("School board collection failed: {}", exception.getCause().toString());
                }
            }
            return notices;
        }
    }

    private List<SchoolNotice> collect(SchoolBoard board) {
        var notices = new ArrayList<SchoolNotice>();
        try {
            var list = fetcher.fetch(board.listUrl());
            var entries = board.parseList(list).stream().limit(NOTICES_PER_BOARD).toList();
            for (var entry : entries) {
                var detail = detail(board, list, entry);
                var postedAt = entry.postedAt() != null ? entry.postedAt() : detail.postedAt();
                notices.add(new SchoolNotice(board.key(), board.kind(), board.name(), board.collegeId(), entry.id(),
                        entry.label(),
                        entry.title(), postedAt, entry.url(), detail.content(), detail.attachments()));
            }
        } catch (IOException | RuntimeException exception) {
            log.warn("School board {} could not be read: {}", board.key(), exception.toString());
        }
        return notices;
    }

    // 상세를 못 읽은 글도 목록 정보와 원문 링크로 보여줄 수 있게 빈 상세로 둔다.
    private Detail detail(SchoolBoard board, Document list, ListEntry entry) {
        try {
            return board.parseDetail(board.fetchDetail(list, entry, fetcher));
        } catch (IOException | RuntimeException exception) {
            log.warn("School notice {} could not be read: {}", entry.url(), exception.toString());
            return new Detail("", null, List.of());
        }
    }

    private void pause() throws IOException {
        if (delayMillis <= 0) return;
        try {
            Thread.sleep(delayMillis);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IOException("interrupted", exception);
        }
    }
}
