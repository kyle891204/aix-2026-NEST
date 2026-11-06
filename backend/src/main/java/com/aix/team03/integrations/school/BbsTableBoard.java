package com.aix.team03.integrations.school;

import com.aix.team03.integrations.school.SchoolNoticeModels.Detail;
import com.aix.team03.integrations.school.SchoolNoticeModels.ListEntry;
import java.util.List;
import org.jsoup.nodes.Document;

/**
 * 글로벌문화통상대학, 커뮤니케이션&컬처대학이 같이 쓰는 표 모양 게시판. 분류(공통·학부·대학원)는 제목 앞 열에 있다.
 * 목록 날짜는 26.10.29처럼 연도가 두 자리라 게시일은 상세에서 읽는다.
 */
abstract class BbsTableBoard implements SchoolBoard {
    @Override
    public List<ListEntry> parseList(Document list) {
        return list.select("td.left a[href*=mode=VIEW]").stream()
                .map(link -> {
                    var cell = link.closest("td");
                    var label = cell == null || cell.previousElementSibling() == null ? "" : cell.previousElementSibling().text();
                    return new ListEntry(BoardHtml.id(link.attr("href")), BoardHtml.webUrl(link), label.strip(),
                            link.text().strip(), null);
                })
                .filter(entry -> entry.id() != null && entry.url() != null)
                .distinct().toList();
    }

    @Override
    public Detail parseDetail(Document detail) {
        // 제목 줄 아래 첫 줄이 "관리자 │ 2026-11-02"다. 제목에도 날짜가 있을 수 있어 제목은 빼고 읽는다.
        var info = detail.selectFirst(".bbs_view th .left p:not(.title)");
        return new Detail(BoardHtml.text(detail.selectFirst("#DivContents")),
                BoardHtml.date(info == null ? "" : info.text()),
                BoardHtml.attachments(detail.select(".bbs_view th a[href*=download.php]")));
    }
}
