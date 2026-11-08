package com.aix.team03.integrations.school;

import com.aix.team03.integrations.school.SchoolNoticeModels.BoardKind;
import com.aix.team03.integrations.school.SchoolNoticeModels.Detail;
import com.aix.team03.integrations.school.SchoolNoticeModels.ListEntry;
import java.util.List;
import org.jsoup.nodes.Document;
import org.springframework.stereotype.Component;

/** 예체능대학 공지. 사이트 주소가 http다. "주요" 배지는 상단 고정 표시라 빼고, 분류는 제목 앞의 [학부] 같은 글이다. */
@Component
public class SportsArtsBoard implements SchoolBoard {
    @Override public String key() { return "erica-sports-arts"; }
    @Override public BoardKind kind() { return BoardKind.COLLEGE; }
    @Override public String name() { return "예체능대학"; }
    @Override public String collegeId() { return "sports-arts"; }
    @Override public String listUrl() { return "http://sportsnarts.hanyang.ac.kr/art/board/board.php?bo_table=notice"; }

    @Override
    public List<ListEntry> parseList(Document list) {
        return list.select("li a[href*=idx=]:has(.sbj)").stream()
                .map(link -> {
                    var subject = link.selectFirst(".sbj").clone();
                    subject.select(".cate").remove();
                    var title = BoardHtml.labeled(subject.text());
                    var year = link.selectFirst(".date .year");
                    var monthDay = link.selectFirst(".date .md");
                    return new ListEntry(BoardHtml.id(link.attr("href")), BoardHtml.webUrl(link), title.label(),
                            title.title(), year == null || monthDay == null ? null
                                    : BoardHtml.date(year.text().strip() + "." + monthDay.text().strip()));
                })
                .filter(entry -> entry.id() != null && entry.url() != null)
                .distinct().toList();
    }

    @Override
    public Detail parseDetail(Document detail) {
        var date = detail.selectFirst(".view .date");
        return new Detail(BoardHtml.text(detail.selectFirst("td.viewcon")),
                BoardHtml.date(date == null ? "" : date.text()),
                BoardHtml.attachments(detail.select(".view th.file a")));
    }
}
