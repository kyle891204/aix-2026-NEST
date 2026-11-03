package com.aix.team03.integrations.school;

import com.aix.team03.integrations.school.SchoolNoticeModels.Attachment;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.jsoup.Jsoup;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * 자동 테스트용: 게시판 HTML을 읽는 코드만 검사한다. 실제 앱은 학교 사이트에 접속해 수집하지만,
 * 테스트는 결과가 사이트 상태에 흔들리지 않고 사이트에 부담을 주지 않도록 실제 구조를 줄인 HTML 예시를 쓴다.
 */
class SchoolBoardParserTests {

    @Test
    void readsGlobalOfficeListAndDetail() {
        var board = new GlobalOfficeBoard();
        var list = Jsoup.parse("""
                <table><tbody><tr><td> 공지 </td><td>기숙사</td>
                <td class="left"><a href="https://global.hanyang.ac.kr/bbs/board.php?bo_table=s4_1&amp;wr_id=262">창의인재원 입사 모집 안내</a></td>
                <td>관리자</td><td>10-23</td></tr></tbody></table>""", board.listUrl());
        var detail = Jsoup.parse("""
                <section id="bo_v_info"><ul><li>작성일 : <strong>2026-10-23</strong></li></ul></section>
                <div id="bo_v_con"><p>입사 신청을 받습니다.</p><p>기간을 확인하세요.</p></div>
                <section id="bo_v_file"><a href="/bbs/download.php?wr_id=262&amp;no=0">안내문.pdf</a></section>""",
                "https://global.hanyang.ac.kr/bbs/board.php?bo_table=s4_1&wr_id=262");

        assertThat(board.parseList(list)).singleElement().satisfies(entry -> {
            assertThat(entry.id()).isEqualTo("262");
            assertThat(entry.label()).isEqualTo("기숙사");
            assertThat(entry.title()).isEqualTo("창의인재원 입사 모집 안내");
            assertThat(entry.postedAt()).isNull();
        });
        var read = board.parseDetail(detail);
        assertThat(read.postedAt()).isEqualTo(LocalDate.of(2026, 10, 23));
        assertThat(read.content()).isEqualTo("입사 신청을 받습니다.\n기간을 확인하세요.");
        assertThat(read.attachments()).containsExactly(
                new Attachment("안내문.pdf", "https://global.hanyang.ac.kr/bbs/download.php?wr_id=262&no=0"));
    }

    @Test
    void readsComputingListAndDetail() {
        var board = new ComputingBoard();
        var list = Jsoup.parse("""
                <table><tbody><tr><td>[공지]</td>
                <td class="left">[학사] <a href='/open/notice.php?ptype=view&idx=4722&page=&code=notice'>계절학기 수강신청 안내</a></td>
                <td>2026.10.28</td><td>401</td></tr></tbody></table>""", board.listUrl());
        var detail = Jsoup.parse("""
                <table><tr><td class="view_detail">작성자 : 관리자 &nbsp; 작성일 : 2026.10.30 &nbsp; 조회수 : 55</td></tr>
                <tr><td><span class="upfile"><a href='/admin/bbs/down.php?code=notice&idx=4722&no=1'>안내.hwp</a></span>
                <span class="upfile"></span></td></tr>
                <tr><td class="view_content"><div class="view_cont"><div>수강신청 일정입니다.<br>꼭 확인하세요.</div></div></td></tr></table>""",
                "http://computing.hanyang.ac.kr/open/notice.php?ptype=view&idx=4722");

        assertThat(board.parseList(list)).singleElement().satisfies(entry -> {
            assertThat(entry.id()).isEqualTo("4722");
            assertThat(entry.label()).isEqualTo("학사");
            assertThat(entry.title()).isEqualTo("계절학기 수강신청 안내");
            assertThat(entry.postedAt()).isEqualTo(LocalDate.of(2026, 10, 28));
            assertThat(entry.url()).isEqualTo("http://computing.hanyang.ac.kr/open/notice.php?ptype=view&idx=4722&page=&code=notice");
        });
        var read = board.parseDetail(detail);
        assertThat(read.postedAt()).isEqualTo(LocalDate.of(2026, 10, 30));
        assertThat(read.content()).isEqualTo("수강신청 일정입니다.\n꼭 확인하세요.");
        assertThat(read.attachments()).extracting(Attachment::name).containsExactly("안내.hwp");
    }

    @Test
    void readsPharmacyListAndDetail() {
        var board = new PharmacyBoard();
        var list = Jsoup.parse("""
                <ul class="board-default-list"><li><a href="/front/information/notice/notice-view?id=1865">
                <span class="subject"><span class="label label-normal">대학원</span> 신입학 모집요강 공고 </span>
                <div class="last"><span class="datetime">2026-09-17</span></div></a></li></ul>""", board.listUrl());
        var detail = Jsoup.parse("""
                <div class="board-default-view"><div class="header"><span class="datetime">2026-09-17 08:41:21</span></div>
                <div class="content"><p>【 모집일정 】</p><p>원서 접수</p></div>
                <ul class="files"><li><a href="/front/information/notice/file-load?id=1865&amp;fileId=3281" class="btn btn-default">다운로드</a>
                <a href="/front/information/notice/file-load?id=1865&amp;fileId=3281" class="btn btn-link">모집요강.pdf</a></li></ul></div>""",
                "https://pharmacy.hanyang.ac.kr/front/information/notice/notice-view?id=1865");

        assertThat(board.parseList(list)).singleElement().satisfies(entry -> {
            assertThat(entry.id()).isEqualTo("1865");
            assertThat(entry.label()).isEqualTo("대학원");
            assertThat(entry.title()).isEqualTo("신입학 모집요강 공고");
            assertThat(entry.postedAt()).isEqualTo(LocalDate.of(2026, 9, 17));
        });
        var read = board.parseDetail(detail);
        assertThat(read.content()).isEqualTo("【 모집일정 】\n원서 접수");
        assertThat(read.attachments()).extracting(Attachment::name).containsExactly("모집요강.pdf");
    }

    @Test
    void dropsLinksThatAreNotWebAddresses() {
        var detail = Jsoup.parse("""
                <section id="bo_v_info">2026-10-23</section><div id="bo_v_con">본문</div>
                <section id="bo_v_file"><a href="javascript:alert(1)">위험.pdf</a></section>""", "https://global.hanyang.ac.kr/");

        assertThat(new GlobalOfficeBoard().parseDetail(detail).attachments()).isEmpty();
    }

    @Test
    void imageOnlyBodyBecomesEmptyText() {
        var detail = Jsoup.parse("<div id=\"bo_v_con\"><p><img src=\"/a.png\"></p></div>", "https://global.hanyang.ac.kr/");

        assertThat(new GlobalOfficeBoard().parseDetail(detail).content()).isEmpty();
        assertThat(new GlobalOfficeBoard().parseDetail(detail).postedAt()).isNull();
    }

    @Test
    void collectorKeepsOtherBoardsWhenOneFails() {
        var global = new GlobalOfficeBoard();
        var pharmacy = new PharmacyBoard();
        var pages = Map.of(
                pharmacy.listUrl(), """
                        <ul class="board-default-list"><li><a href="/front/information/notice/notice-view?id=1">
                        <span class="subject">일반 공지</span><span class="datetime">2026-10-01</span></a></li></ul>""",
                "https://pharmacy.hanyang.ac.kr/front/information/notice/notice-view?id=1",
                "<div class=\"board-default-view\"><div class=\"content\">본문</div></div>");
        var collector = new SchoolNoticeCollector(List.of(global, pharmacy), url -> {
            if (!pages.containsKey(url)) throw new java.io.IOException("unreachable " + url);
            return Jsoup.parse(pages.get(url), url);
        }, 0);

        assertThat(collector.collect()).singleElement().satisfies(notice -> {
            assertThat(notice.boardKey()).isEqualTo("erica-pharmacy");
            assertThat(notice.collegeId()).isEqualTo("pharmacy");
            assertThat(notice.id()).isEqualTo("1");
            assertThat(notice.postedAt()).isEqualTo(LocalDate.of(2026, 10, 1));
            assertThat(notice.content()).isEqualTo("본문");
        });
    }
}
