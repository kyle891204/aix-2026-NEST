package com.aix.team03.integrations.school;

import com.aix.team03.integrations.school.SchoolNoticeModels.BoardKind;
import com.aix.team03.integrations.school.SchoolNoticeModels.Detail;
import com.aix.team03.integrations.school.SchoolNoticeModels.ListEntry;
import java.util.List;
import org.jsoup.nodes.Document;
import org.springframework.stereotype.Component;

/** 약학대학 공지. 분류(대학원·일반 등)는 제목 앞의 배지다. */
@Component
public class PharmacyBoard implements SchoolBoard {
    @Override public String key() { return "erica-pharmacy"; }
    @Override public BoardKind kind() { return BoardKind.COLLEGE; }
    @Override public String name() { return "약학대학"; }
    @Override public String collegeId() { return "pharmacy"; }
    @Override public String listUrl() { return "https://pharmacy.hanyang.ac.kr/front/information/notice"; }

    @Override
    public List<ListEntry> parseList(Document list) {
        return list.select("ul.board-default-list a[href*=notice-view]").stream()
                .map(link -> {
                    var subject = link.selectFirst(".subject");
                    var label = subject == null ? null : subject.selectFirst(".label");
                    var title = subject == null ? link.clone() : subject.clone();
                    title.select(".label, .sr-only").remove();
                    var date = link.selectFirst(".datetime");
                    return new ListEntry(BoardHtml.id(link.attr("href")), BoardHtml.webUrl(link),
                            label == null ? "" : label.text().strip(), title.text().strip(),
                            BoardHtml.date(date == null ? "" : date.text()));
                })
                .filter(entry -> entry.id() != null && entry.url() != null)
                .toList();
    }

    @Override
    public Detail parseDetail(Document detail) {
        var date = detail.selectFirst(".board-default-view .datetime");
        return new Detail(BoardHtml.text(detail.selectFirst(".board-default-view .content")),
                BoardHtml.date(date == null ? "" : date.text()),
                BoardHtml.attachments(detail.select(".board-default-view .files a.btn-link")));
    }
}
