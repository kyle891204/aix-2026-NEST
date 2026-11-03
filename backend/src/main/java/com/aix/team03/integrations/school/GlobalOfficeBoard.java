package com.aix.team03.integrations.school;

import com.aix.team03.integrations.school.SchoolNoticeModels.BoardKind;
import com.aix.team03.integrations.school.SchoolNoticeModels.Detail;
import com.aix.team03.integrations.school.SchoolNoticeModels.ListEntry;
import java.util.List;
import org.jsoup.nodes.Document;
import org.springframework.stereotype.Component;

/** ERICA 국제처 공지. 목록에는 연도 없는 날짜만 있어 게시일은 상세에서 읽는다. 분류는 제목 앞 열에 있다. */
@Component
public class GlobalOfficeBoard implements SchoolBoard {
    @Override public String key() { return "erica-global"; }
    @Override public BoardKind kind() { return BoardKind.INTERNATIONAL; }
    @Override public String name() { return "ERICA 국제처"; }
    @Override public String listUrl() { return "https://global.hanyang.ac.kr/bbs/board.php?bo_table=s4_1"; }

    @Override
    public List<ListEntry> parseList(Document list) {
        return list.select("td.left a[href*=wr_id]").stream()
                .map(link -> {
                    var cell = link.closest("td");
                    var label = cell == null || cell.previousElementSibling() == null ? "" : cell.previousElementSibling().text();
                    return new ListEntry(BoardHtml.id(link.attr("href")), BoardHtml.webUrl(link), label.strip(),
                            link.text().strip(), null);
                })
                .filter(entry -> entry.id() != null && entry.url() != null)
                .toList();
    }

    @Override
    public Detail parseDetail(Document detail) {
        var info = detail.selectFirst("#bo_v_info");
        return new Detail(BoardHtml.text(detail.selectFirst("#bo_v_con")),
                BoardHtml.date(info == null ? "" : info.text()),
                BoardHtml.attachments(detail.select("#bo_v_file a")));
    }
}
