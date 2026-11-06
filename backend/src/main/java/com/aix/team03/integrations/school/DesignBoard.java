package com.aix.team03.integrations.school;

import com.aix.team03.integrations.school.SchoolNoticeModels.Attachment;
import com.aix.team03.integrations.school.SchoolNoticeModels.BoardKind;
import com.aix.team03.integrations.school.SchoolNoticeModels.Detail;
import com.aix.team03.integrations.school.SchoolNoticeModels.ListEntry;
import java.util.List;
import org.jsoup.nodes.Document;
import org.springframework.stereotype.Component;

/** 디자인대학 공지. 사이트 주소가 http다. 분류는 제목 앞의 [수업] 같은 글이고, 첨부 링크 글이 "다운로드"라 파일 이름은 옆에서 읽는다. */
@Component
public class DesignBoard implements SchoolBoard {
    @Override public String key() { return "erica-design"; }
    @Override public BoardKind kind() { return BoardKind.COLLEGE; }
    @Override public String name() { return "디자인대학"; }
    @Override public String collegeId() { return "design"; }
    @Override public String listUrl() { return "http://idesign.hanyang.ac.kr/bbs/board.php?bo_table=notice"; }

    @Override
    public List<ListEntry> parseList(Document list) {
        return list.select(".bl-list .bl-subj a[href*=wr_id]").stream()
                .map(link -> {
                    var label = link.selectFirst("span.text-gray");
                    var subject = link.selectFirst("span.subj");
                    var row = link.closest(".bl-list");
                    return new ListEntry(BoardHtml.id(link.attr("href")), BoardHtml.webUrl(link),
                            label == null ? "" : label.text().replaceAll("[\\[\\]]", "").strip(),
                            (subject == null ? link : subject).text().strip(),
                            BoardHtml.date(row == null ? "" : row.select(".bl-item").text()));
                })
                .filter(entry -> entry.id() != null && entry.url() != null)
                .distinct().toList();
    }

    @Override
    public Detail parseDetail(Document detail) {
        var info = detail.selectFirst(".board-view-info .info-box-bottom");
        var files = detail.select(".board-view-file li").stream()
                .map(item -> {
                    var name = item.selectFirst("strong");
                    var link = item.selectFirst("a.view_file_download");
                    return name == null || link == null ? null
                            : new Attachment(name.text().strip(), BoardHtml.webUrl(link));
                })
                .filter(file -> file != null && !file.name().isEmpty() && file.url() != null)
                .distinct().toList();
        return new Detail(BoardHtml.text(detail.selectFirst("#board_view_con")),
                BoardHtml.date(info == null ? "" : info.text()), files);
    }
}
