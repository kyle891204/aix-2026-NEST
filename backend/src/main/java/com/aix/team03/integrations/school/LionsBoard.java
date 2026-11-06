package com.aix.team03.integrations.school;

import com.aix.team03.integrations.school.SchoolNoticeCollector.HtmlFetcher;
import com.aix.team03.integrations.school.SchoolNoticeModels.BoardKind;
import com.aix.team03.integrations.school.SchoolNoticeModels.Detail;
import com.aix.team03.integrations.school.SchoolNoticeModels.ListEntry;
import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Component;

/**
 * LIONS칼리지 공지. 글마다 주소가 없고 목록 페이지의 폼에 글 토큰을 넣어 전송해야 상세가 열린다.
 * 토큰은 목록을 열 때마다 바뀌어, 공지 ID는 등록일과 제목으로 만들고 원문 링크는 목록 페이지로 둔다.
 */
@Component
public class LionsBoard implements SchoolBoard {
    private static final Pattern TOKEN = Pattern.compile("moveView\\('([0-9A-Fa-f]+)'\\)");

    @Override public String key() { return "erica-lions"; }
    @Override public BoardKind kind() { return BoardKind.COLLEGE; }
    @Override public String name() { return "LIONS칼리지"; }
    @Override public String collegeId() { return "lions"; }
    @Override public String listUrl() { return "https://lions.hanyang.ac.kr/lions/sub/sub5-1.aspx"; }

    @Override
    public List<ListEntry> parseList(Document list) {
        return rows(list).stream().map(this::entry).filter(entry -> entry != null).distinct().toList();
    }

    @Override
    public Document fetchDetail(Document list, ListEntry entry, HtmlFetcher fetcher) throws IOException {
        var token = rows(list).stream()
                .filter(row -> entry.equals(entry(row)))
                .map(row -> TOKEN.matcher(row.select("a[onclick*=moveView]").attr("onclick")))
                .filter(matcher -> matcher.find())
                .map(matcher -> matcher.group(1))
                .findFirst()
                .orElseThrow(() -> new IOException("LIONS notice token not found: " + entry.title()));
        var form = new LinkedHashMap<String, String>();
        for (var input : list.select("#form1 input[type=hidden]")) form.put(input.attr("name"), input.val());
        form.put("nnumlions", token);
        return fetcher.post(listUrl(), form);
    }

    @Override
    public Detail parseDetail(Document detail) {
        var date = detail.selectFirst("#wDate");
        return new Detail(BoardHtml.text(detail.selectFirst("#content")),
                BoardHtml.date(date == null ? "" : date.text()),
                BoardHtml.attachments(detail.select("#Downloader_fileList a")));
    }

    private static List<Element> rows(Document list) {
        return list.select("tr:has(a[onclick*=moveView])");
    }

    private ListEntry entry(Element row) {
        var subject = row.selectFirst("td[data-label=제목]");
        var posted = Optional.ofNullable(row.selectFirst("td[data-label=등록일]"))
                .map(cell -> BoardHtml.date(cell.text())).orElse(null);
        if (subject == null || posted == null) return null;
        var title = BoardHtml.labeled(subject.text());
        return new ListEntry(id(posted, subject.text().strip()), listUrl(), title.label(), title.title(), posted);
    }

    // String.hashCode는 자바 명세로 값이 정해져 있어 서버를 다시 켜도 같은 ID가 나온다.
    private static String id(LocalDate posted, String title) {
        return posted.format(DateTimeFormatter.BASIC_ISO_DATE) + "-" + String.format("%08x", title.hashCode());
    }
}
