package com.aix.team03.integrations.school;

import com.aix.team03.integrations.school.SchoolNoticeModels.BoardKind;
import com.aix.team03.integrations.school.SchoolNoticeModels.Detail;
import com.aix.team03.integrations.school.SchoolNoticeModels.ListEntry;
import java.util.List;
import java.util.regex.Pattern;
import org.jsoup.nodes.Document;
import org.springframework.stereotype.Component;

/** 소프트웨어융합대학 공지. 사이트의 https 인증서가 맞지 않아 http 주소를 쓴다. 분류는 링크 앞의 [학사] 같은 글이다. */
@Component
public class ComputingBoard implements SchoolBoard {
    private static final Pattern LABEL = Pattern.compile("^\\[([^\\]]{1,20})\\]");

    @Override public String key() { return "erica-computing"; }
    @Override public BoardKind kind() { return BoardKind.COLLEGE; }
    @Override public String name() { return "소프트웨어융합대학"; }
    @Override public String collegeId() { return "computing"; }
    @Override public String listUrl() { return "http://computing.hanyang.ac.kr/open/notice.php"; }

    @Override
    public List<ListEntry> parseList(Document list) {
        return list.select("td.left a[href*=ptype=view]").stream()
                .map(link -> {
                    var cell = link.closest("td");
                    var row = link.closest("tr");
                    var label = cell == null ? null : LABEL.matcher(cell.text().strip());
                    return new ListEntry(BoardHtml.id(link.attr("href")), BoardHtml.webUrl(link),
                            label != null && label.find() ? label.group(1).strip() : "", link.text().strip(),
                            row == null ? null : BoardHtml.date(row.text()));
                })
                .filter(entry -> entry.id() != null && entry.url() != null)
                .toList();
    }

    @Override
    public Detail parseDetail(Document detail) {
        var info = detail.selectFirst(".view_detail");
        return new Detail(BoardHtml.text(detail.selectFirst(".view_cont")),
                BoardHtml.date(info == null ? "" : info.text()),
                BoardHtml.attachments(detail.select(".upfile a")));
    }
}
