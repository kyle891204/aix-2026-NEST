package com.aix.team03.course;

import org.jsoup.Jsoup;
import org.jsoup.nodes.TextNode;

/** LMS 공지 본문·과제 설명(HTML)을 화면에 그대로 보여줄 수 있는 글로 바꾼다. 태그·스크립트는 남기지 않는다. */
final class CourseText {
    private CourseText() {}

    /** 줄바꿈을 살린 글. 비어 있거나 이미지만 있는 본문은 null이다. */
    static String of(String html) {
        if (html == null || html.isBlank()) return null;
        var body = Jsoup.parseBodyFragment(html).body();
        body.select("script, style").remove();
        // <br>은 wholeText가 이미 줄바꿈으로 바꾸므로 블록 요소 뒤에만 줄바꿈을 넣는다.
        for (var block : body.select("p, div, li, tr, h1, h2, h3, h4, table")) block.after(new TextNode("\n"));
        var lines = body.wholeText().replace(' ', ' ').lines()
                .map(line -> line.replaceAll("[ \\t]+", " ").strip()).toList();
        var text = String.join("\n", lines).replaceAll("\n{3,}", "\n\n").strip();
        return text.isEmpty() ? null : text;
    }
}
