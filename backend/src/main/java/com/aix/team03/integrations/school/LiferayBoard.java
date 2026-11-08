package com.aix.team03.integrations.school;

import com.aix.team03.integrations.school.SchoolNoticeModels.Detail;
import com.aix.team03.integrations.school.SchoolNoticeModels.ListEntry;
import java.util.List;
import java.util.regex.Pattern;
import org.jsoup.nodes.Document;

/**
 * 한양대 공통 홈페이지(Liferay) 게시판. 공학대학, 경상대학, 학사 공지가 같은 구조다.
 * 목록 링크가 주소 없이 스크립트로 글을 열어, 스크립트의 글 번호로 상세 주소를 만든다.
 */
abstract class LiferayBoard implements SchoolBoard {
    private static final Pattern MESSAGE_ID = Pattern.compile("viewMessage\\((\\d+)");
    private static final String PORTLET = "_kr_ac_hanyang_bbs_web_portlet_BbsPortlet_";

    @Override
    public List<ListEntry> parseList(Document list) {
        return list.select(".hyu-list-body-item h4 a[onclick*=viewMessage]").stream()
                .map(link -> {
                    var matcher = MESSAGE_ID.matcher(link.attr("onclick"));
                    if (!matcher.find()) return null;
                    var item = link.closest(".hyu-list-body-item");
                    var title = BoardHtml.labeled(link.text());
                    return new ListEntry(matcher.group(1), detailUrl(matcher.group(1)), title.label(), title.title(),
                            BoardHtml.date(item == null ? "" : item.select("span.date").text()));
                })
                .filter(entry -> entry != null)
                .distinct().toList();
    }

    private String detailUrl(String messageId) {
        return listUrl() + "?p_p_id=kr_ac_hanyang_bbs_web_portlet_BbsPortlet&p_p_lifecycle=0&" + PORTLET
                + "action=view_message&" + PORTLET + "messageId=" + messageId;
    }

    @Override
    public Detail parseDetail(Document detail) {
        // 등록일, 공지일 같은 항목이 같은 모양이라 이름이 등록일인 항목만 읽는다.
        var posted = detail.select(".hyu-meta-item").stream()
                .filter(item -> item.child(0).text().strip().equals("등록일"))
                .findFirst();
        return new Detail(BoardHtml.text(detail.selectFirst(".entry-content .item-content")),
                BoardHtml.date(posted.map(item -> item.text()).orElse("")),
                BoardHtml.attachments(detail.select(".file-download a")));
    }
}
