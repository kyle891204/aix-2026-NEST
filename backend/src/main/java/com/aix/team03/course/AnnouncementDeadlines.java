package com.aix.team03.course;

import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.jsoup.Jsoup;

/**
 * LMS 과목 공지에는 마감일 칸이 없어, 본문의 "11/20(금) 23:59까지 제출", "11월 20일까지", "~ 2026.11.20 마감" 같은
 * 문구에서 마감을 규칙으로 찾는다. 날짜 바로 뒤에 "까지·마감·제출·due"가 오거나 바로 앞에 "~·마감·기한·deadline"이
 * 있어야 마감으로 본다. 찾지 못하면 null이다(화면에는 "마감 확인 필요"와 원문 확인 안내).
 */
final class AnnouncementDeadlines {
    private static final ZoneId KOREA = ZoneId.of("Asia/Seoul");
    // 2026.11.20 / 11/20 / 11-20 / 2026년 11월 20일 / 11월 20일, 뒤에 (금)·오후 6시·18:00 같은 요일·시각이 올 수 있다.
    private static final Pattern DATE = Pattern.compile(
            "(?:(\\d{4})\\s*[./-]\\s*)?(\\d{1,2})\\s*[./-]\\s*(\\d{1,2})(?!\\d)"
                    + "|(?:(\\d{4})\\s*년\\s*)?(\\d{1,2})\\s*월\\s*(\\d{1,2})\\s*일");
    private static final Pattern AFTER = Pattern.compile(
            "^\\s*(?:\\([^)]{1,3}\\)\\s*)?(?:(오전|오후|AM|PM|am|pm)\\s*)?"
                    + "(?:(\\d{1,2})\\s*(?::\\s*(\\d{2})|시(?:\\s*(\\d{1,2})\\s*분)?)\\s*)?(?:\\([^)]{1,3}\\)\\s*)?");
    private static final Pattern AFTER_WORD = Pattern.compile(
            "^(?:까지|마감|제출|이내|due|until|by)", Pattern.CASE_INSENSITIVE);
    private static final Pattern BEFORE_WORD = Pattern.compile(
            "(?:~|∼|마감|기한|마감일|제출일|due|deadline|until)\\s*[:：]?\\s*$", Pattern.CASE_INSENSITIVE);

    private AnnouncementDeadlines() {}

    /** 본문(HTML)에서 처음 나오는 마감을 한국 시간 ISO 8601로 돌려준다. 연도가 없으면 게시일 기준, 시각이 없으면 23:59다. */
    static String find(String html, String postedAt) {
        if (html == null || html.isBlank()) return null;
        var text = Jsoup.parse(html).text();
        var posted = postedDate(postedAt);
        Matcher date = DATE.matcher(text);
        while (date.find()) {
            Matcher after = AFTER.matcher(text.substring(date.end()));
            after.lookingAt();
            var rest = text.substring(date.end() + after.end());
            var before = text.substring(Math.max(0, date.start() - 12), date.start());
            if (!AFTER_WORD.matcher(rest).lookingAt() && !BEFORE_WORD.matcher(before).find()) continue;
            var deadline = deadline(date, after, posted);
            if (deadline != null) return deadline.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
        }
        return null;
    }

    private static OffsetDateTime deadline(Matcher date, Matcher after, LocalDate posted) {
        boolean dotted = date.group(2) != null;
        String year = dotted ? date.group(1) : date.group(4);
        int month = Integer.parseInt(dotted ? date.group(2) : date.group(5));
        int day = Integer.parseInt(dotted ? date.group(3) : date.group(6));
        try {
            var day0 = LocalDate.of(year != null ? Integer.parseInt(year) : posted.getYear(), month, day);
            // 연도 없이 12월 공지에 "1/5까지"라고 쓰면 다음 해 1월이다.
            if (year == null && day0.isBefore(posted.minusDays(7))) day0 = day0.plusYears(1);
            return OffsetDateTime.of(day0, time(after), ZoneOffset.ofHours(9));
        } catch (DateTimeException | NumberFormatException exception) {
            return null;
        }
    }

    private static LocalTime time(Matcher after) {
        if (after.group(2) == null) return LocalTime.of(23, 59);
        int hour = Integer.parseInt(after.group(2));
        String minuteText = after.group(3) != null ? after.group(3) : after.group(4);
        int minute = minuteText == null ? 0 : Integer.parseInt(minuteText);
        var noon = after.group(1);
        if (noon != null && (noon.equals("오후") || noon.equalsIgnoreCase("PM")) && hour < 12) hour += 12;
        if (noon != null && (noon.equals("오전") || noon.equalsIgnoreCase("AM")) && hour == 12) hour = 0;
        // 24:00은 그날 23:59로 본다.
        if (hour == 24 && minute == 0) return LocalTime.of(23, 59);
        return LocalTime.of(hour, minute);
    }

    private static LocalDate postedDate(String postedAt) {
        try {
            return OffsetDateTime.parse(postedAt).atZoneSameInstant(KOREA).toLocalDate();
        } catch (DateTimeParseException | NullPointerException exception) {
            return LocalDate.now(KOREA);
        }
    }
}
