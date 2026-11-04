package com.aix.team03.integrations.school;

import com.aix.team03.integrations.school.SchoolNoticeModels.Detail;
import com.aix.team03.integrations.school.SchoolNoticeModels.ListEntry;
import com.aix.team03.integrations.school.SchoolNoticeModels.SchoolNotice;
import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executors;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.stream.Collectors;
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
    private final Map<String, BoardList> lists = new ConcurrentHashMap<>();

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

    /**
     * 게시판마다 목록 첫 페이지만 읽는다. 본문은 아직 없는(content가 null인) 공지로 돌려주고,
     * 상세는 {@link #collectDetails}로 따로 읽는다. 목록 12쪽만 읽어 첫 화면을 빨리 보여주기 위해서다.
     */
    public List<SchoolNotice> collectLists() {
        return inParallel(boards, board -> {
            try {
                var page = fetcher.fetch(board.listUrl());
                var entries = board.parseList(page).stream().limit(NOTICES_PER_BOARD).toList();
                // LIONS칼리지처럼 상세를 목록 페이지의 폼으로 여는 게시판을 위해 마지막 목록 페이지를 둔다.
                lists.put(board.key(), new BoardList(board, page, entries));
                return entries.stream().map(entry -> notice(board, entry, null)).toList();
            } catch (IOException | RuntimeException exception) {
                log.warn("School board {} could not be read: {}", board.key(), exception.toString());
                return List.of();
            }
        });
    }

    /** 공지의 상세를 게시판별로 읽고, 한 게시판을 다 읽을 때마다 그 게시판 공지를 넘긴다. */
    public void collectDetails(List<SchoolNotice> pending, Consumer<List<SchoolNotice>> onBoardRead) {
        var byBoard = pending.stream()
                .collect(Collectors.groupingBy(SchoolNotice::boardKey, LinkedHashMap::new, Collectors.toList()));
        inParallel(List.copyOf(byBoard.values()), notices -> {
            var list = lists.get(notices.getFirst().boardKey());
            if (list == null) return List.of();
            var read = notices.stream()
                    .flatMap(notice -> list.entries().stream().filter(entry -> entry.id().equals(notice.id())))
                    .map(entry -> {
                        var detail = detail(list, entry);
                        return notice(list.board(), entry, detail);
                    })
                    .toList();
            onBoardRead.accept(read);
            return read;
        });
    }

    private record BoardList(SchoolBoard board, Document page, List<ListEntry> entries) {}

    private static SchoolNotice notice(SchoolBoard board, ListEntry entry, Detail detail) {
        // 상세의 게시일이 목록보다 정확해서(연도 포함) 먼저 쓴다.
        var postedAt = detail != null && detail.postedAt() != null ? detail.postedAt() : entry.postedAt();
        return new SchoolNotice(board.key(), board.kind(), board.name(), board.collegeId(), entry.id(), entry.label(),
                entry.title(), postedAt, entry.url(), detail == null ? null : detail.content(),
                detail == null ? List.of() : detail.attachments());
    }

    // 게시판마다 사이트가 달라 동시에 읽는다. 한 게시판 안에서는 요청 사이를 띄우므로 사이트마다 부담은 그대로다.
    private <T> List<SchoolNotice> inParallel(List<T> items, Function<T, List<SchoolNotice>> work) {
        if (items.isEmpty()) return List.of();
        try (var pool = Executors.newFixedThreadPool(items.size())) {
            var results = items.stream().map(item -> pool.submit(() -> work.apply(item))).toList();
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

    // 상세를 못 읽은 글도 목록 정보와 원문 링크로 보여줄 수 있게 빈 상세로 둔다.
    private Detail detail(BoardList list, ListEntry entry) {
        try {
            return list.board().parseDetail(list.board().fetchDetail(list.page(), entry, fetcher));
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
