package com.aix.team03.integrations.school;

import com.aix.team03.integrations.school.SchoolNoticeModels.Attachment;
import com.aix.team03.integrations.school.SchoolNoticeModels.BoardKind;
import com.aix.team03.integrations.school.SchoolNoticeModels.Detail;
import com.aix.team03.integrations.school.SchoolNoticeModels.ListEntry;
import java.util.List;
import java.util.regex.Pattern;
import org.jsoup.nodes.Document;
import org.springframework.stereotype.Component;

/** 첨단융합대학 학부 공지. 글 ID가 숫자가 아니라 영문 토큰이다. 제목 앞의 "공지" 배지는 상단 고정 표시라 분류로 쓰지 않는다. */
@Component
public class AdvancedConvergenceBoard implements SchoolBoard {
    private static final Pattern ID = Pattern.compile("[?&]id=([\\w-]+)");

    @Override public String key() { return "erica-advanced-convergence"; }
    @Override public BoardKind kind() { return BoardKind.COLLEGE; }
    @Override public String name() { return "첨단융합대학"; }
    @Override public String collegeId() { return "advanced-convergence"; }
    @Override public String listUrl() { return "https://atc.hanyang.ac.kr/front/community/undergraduate"; }

    @Override
    public List<ListEntry> parseList(Document list) {
        return list.select("li.board-default-item a[href*=/read?id=]").stream()
                .map(link -> {
                    var matcher = ID.matcher(link.attr("href"));
                    var subject = link.selectFirst(".board-default-item-title");
                    var text = subject == null ? link.clone() : subject.clone();
                    text.select(".label").remove();
                    var title = BoardHtml.labeled(text.text());
                    var date = link.selectFirst("[data-time-2]");
                    return new ListEntry(matcher.find() ? matcher.group(1) : null, BoardHtml.webUrl(link),
                            title.label(), title.title(), BoardHtml.date(date == null ? "" : date.attr("data-time-2")));
                })
                .filter(entry -> entry.id() != null && entry.url() != null)
                .distinct().toList();
    }

    @Override
    public Detail parseDetail(Document detail) {
        var date = detail.selectFirst("[data-time-2]");
        return new Detail(BoardHtml.text(detail.selectFirst(".board-default-read-content .content-field")),
                BoardHtml.date(date == null ? "" : date.attr("data-time-2")), attachments(detail));
    }

    // 첨부 링크 글이 비어 있어 파일 이름은 같은 항목의 이름 칸에서 읽는다.
    private static List<Attachment> attachments(Document detail) {
        return detail.select(".cms-af-md-af-list a[href*=/file/down/]").stream()
                .map(link -> {
                    var item = link.parents().stream()
                            .filter(parent -> parent.selectFirst(".cms-af-md-af-list-item-name") != null)
                            .findFirst();
                    var name = item.map(parent -> parent.selectFirst(".cms-af-md-af-list-item-name").text().strip())
                            .orElse("");
                    return new Attachment(name, BoardHtml.webUrl(link));
                })
                .filter(file -> !file.name().isEmpty() && file.url() != null)
                .distinct().toList();
    }
}
