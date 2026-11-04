package com.aix.team03.integrations.school;

import com.aix.team03.integrations.school.SchoolNoticeModels.Attachment;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.regex.Pattern;
import org.jsoup.nodes.Element;
import org.jsoup.nodes.TextNode;
import org.jsoup.select.Elements;

/** 게시판 HTML에서 본문 글, 날짜, 링크를 꺼내는 공통 처리. */
final class BoardHtml {
    private static final Pattern DATE = Pattern.compile("(20\\d{2})[.\\-/]\\s?(\\d{1,2})[.\\-/]\\s?(\\d{1,2})");
    private static final Pattern MONTH_DAY = Pattern.compile("(\\d{1,2})-(\\d{1,2})");
    private static final Pattern TIME = Pattern.compile("\\d{1,2}:\\d{2}");
    static final ZoneId KOREA = ZoneId.of("Asia/Seoul");
    private static final Pattern ID =Pattern.compile("[?&](?:wr_id|idx|id|num)=(\\d+)");
    private static final Pattern LABEL = Pattern.compile("^\\[([^\\]]{1,20})\\]\\s*(.*)$", Pattern.DOTALL);

    /** 제목 앞의 [학부] 같은 분류와 나머지 제목. 분류가 없으면 분류는 빈 문자열이다. */
    record LabeledTitle(String label, String title) {}

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

    static LabeledTitle labeled(String title) {
        var text = title == null ? "" : title.strip();
        var matcher = LABEL.matcher(text);
        return matcher.matches() ? new LabeledTitle(matcher.group(1).strip(), matcher.group(2).strip())
                : new LabeledTitle("", text);
    }

    /**
     * 연도 없이 "10-23"으로 적힌 목록 날짜. 오늘보다 뒤면 작년 글로 본다. 오늘 글은 "14:05"처럼 시각만 적혀 오늘로 본다.
     * 상세를 읽으면 상세의 날짜로 바뀌므로, 본문을 읽기 전 잠깐 보여줄 날짜다.
     */
    static LocalDate monthDay(String text, LocalDate today) {
        var value = text == null ? "" : text.strip();
        if (TIME.matcher(value).matches()) return today;
        var matcher = MONTH_DAY.matcher(value);
        if (!matcher.matches()) return null;
        try {
            var date = LocalDate.of(today.getYear(), Integer.parseInt(matcher.group(1)), Integer.parseInt(matcher.group(2)));
            return date.isAfter(today) ? date.minusYears(1) : date;
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
