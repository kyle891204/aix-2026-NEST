package com.aix.team03.integrations.school;

import com.aix.team03.integrations.school.SchoolNoticeModels.Attachment;
import java.time.LocalDate;
import java.util.List;
import java.util.regex.Pattern;
import org.jsoup.nodes.Element;
import org.jsoup.nodes.TextNode;
import org.jsoup.select.Elements;

/** 게시판 HTML에서 본문 글, 날짜, 링크를 꺼내는 공통 처리. */
final class BoardHtml {
    private static final Pattern DATE = Pattern.compile("(20\\d{2})[.\\-/]\\s?(\\d{1,2})[.\\-/]\\s?(\\d{1,2})");
    private static final Pattern ID = Pattern.compile("[?&](?:wr_id|idx|id)=(\\d+)");

    private BoardHtml() {}

    /** 줄바꿈을 살린 본문 글. 이미지만 있는 본문은 빈 문자열이 된다. */
    static String text(Element element) {
        if (element == null) return "";
        var copy = element.clone();
        copy.select("script, style").remove();
        // <br>은 wholeText가 이미 줄바꿈으로 바꾸므로 블록 요소 뒤에만 줄바꿈을 넣는다.
        for (var block : copy.select("p, div, li, tr, h1, h2, h3, h4, table")) block.after(new TextNode("\n"));
        var lines = copy.wholeText().replace(' ', ' ').lines()
                .map(line -> line.replaceAll("[ \\t]+", " ").strip()).toList();
        return String.join("\n", lines).replaceAll("\n{3,}", "\n\n").strip();
    }

    static LocalDate date(String text) {
        var matcher = DATE.matcher(text == null ? "" : text);
        if (!matcher.find()) return null;
        try {
            return LocalDate.of(Integer.parseInt(matcher.group(1)), Integer.parseInt(matcher.group(2)),
                    Integer.parseInt(matcher.group(3)));
        } catch (RuntimeException exception) {
            return null;
        }
    }

    static String id(String url) {
        var matcher = ID.matcher(url);
        return matcher.find() ? matcher.group(1) : null;
    }

    /** 화면에 링크로 내보내도 되는 http, https 주소만 남긴다. */
    static String webUrl(Element link) {
        var url = link.absUrl("href");
        return url.startsWith("https://") || url.startsWith("http://") ? url : null;
    }

    static List<Attachment> attachments(Elements links) {
        return links.stream()
                .map(link -> new Attachment(link.text().strip(), webUrl(link)))
                .filter(file -> !file.name().isEmpty() && file.url() != null)
                .distinct().toList();
    }
}
