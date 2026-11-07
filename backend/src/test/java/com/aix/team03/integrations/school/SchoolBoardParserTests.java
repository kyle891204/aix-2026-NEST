package com.aix.team03.integrations.school;

import com.aix.team03.integrations.school.SchoolNoticeModels.Attachment;
import com.aix.team03.integrations.school.SchoolNoticeModels.SchoolNotice;
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
            assertThat(entry.postedAt()).isEqualTo(BoardHtml.monthDay("10-23", LocalDate.now(BoardHtml.KOREA)));
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
    void readsLiferayListAndDetail() {
        var board = new HaksaBoard();
        var list = Jsoup.parse("""
                <div class="hyu-list-body-item showThumbnail">
                <div class="hyu-list-body-thumbnail"><a href="#none" onclick="_kr_ac_hanyang_bbs_web_portlet_BbsPortlet_viewMessage(228613, true, false)"><img src="/a.png"></a></div>
                <h4><span class="hyu-badge">주요공지</span> <a href="#none" onclick="_kr_ac_hanyang_bbs_web_portlet_BbsPortlet_viewMessage(228613, true, false)"> [ERICA 학부] 겨울계절학기 수요조사 안내 </a></h4>
                <p><span class="date">&nbsp;/&nbsp;</span> <span class="date">2026. 9. 22</span></p></div>""", board.listUrl());
        var detail = Jsoup.parse("""
                <div class="hyu-meta-item"><span>등록일</span> <span>2026. 9. 22 </span></div>
                <div class="hyu-meta-item"><span>공지일</span> <span>2026. 9. 22 ~ 2027. 2. 20</span></div>
                <div class="hyu-meta-item file-download"><a href="https://ehaksa.hanyang.ac.kr/documents/portlet_file_entry/1/a.pdf?download=true"> 안내문.pdf </a></div>
                <div class="hyu-list-body-item entry-content"><div class="item-content"> 수요조사에 참여해 주세요.<br> 기간을 확인하세요. </div></div>""",
                board.listUrl());

        assertThat(board.parseList(list)).singleElement().satisfies(entry -> {
            assertThat(entry.id()).isEqualTo("228613");
            assertThat(entry.label()).isEqualTo("ERICA 학부");
            assertThat(entry.title()).isEqualTo("겨울계절학기 수요조사 안내");
            assertThat(entry.postedAt()).isEqualTo(LocalDate.of(2026, 9, 22));
            assertThat(entry.url()).startsWith("https://ehaksa.hanyang.ac.kr/notice?p_p_id=")
                    .endsWith("_messageId=228613");
        });
        var read = board.parseDetail(detail);
        assertThat(read.postedAt()).isEqualTo(LocalDate.of(2026, 9, 22));
        assertThat(read.content()).isEqualTo("수요조사에 참여해 주세요.\n기간을 확인하세요.");
        assertThat(read.attachments()).extracting(Attachment::name).containsExactly("안내문.pdf");
        assertThat(board.collegeId()).isNull();
    }

    @Test
    void readsAdvancedConvergenceTokenIds() {
        var board = new AdvancedConvergenceBoard();
        var list = Jsoup.parse("""
                <ul class="board-default-list"><li class="board-default-item">
                <a href="/front/community/undergraduate/read?id=AaF_tVQwfo2rgY7lsZPFUw&amp;sd=12">
                <div class="board-default-item-date" data-time-2="2026-10-28T10:00"><p></p></div>
                <div class="board-default-item-title"><p><span class="label label-primary">공지</span> [사회봉사단] 수강신청 일정 안내 </p></div>
                </a></li></ul>""", board.listUrl());

        assertThat(board.parseList(list)).singleElement().satisfies(entry -> {
            assertThat(entry.id()).isEqualTo("AaF_tVQwfo2rgY7lsZPFUw");
            assertThat(entry.label()).isEqualTo("사회봉사단");
            assertThat(entry.title()).isEqualTo("수강신청 일정 안내");
            assertThat(entry.postedAt()).isEqualTo(LocalDate.of(2026, 10, 28));
        });
        var detail = Jsoup.parse("""
                <div class="board-default-read-date" data-time-2="2026-10-28T10:00"></div>
                <div class="board-default-read-content"><div class="content-field"><p>수강신청을 하세요.</p></div></div>
                <div class="cms-af-md-af-list"><ul><li><div><p class="cms-af-md-af-list-item-name"> 안내문.jpg </p></div>
                <div class="btn-wrapper"><a href="/b/file/down/AaF_t/a.jpg" target="_blank"></a></div></li></ul></div>""",
                board.listUrl());
        var read = board.parseDetail(detail);
        assertThat(read.postedAt()).isEqualTo(LocalDate.of(2026, 10, 28));
        assertThat(read.content()).isEqualTo("수강신청을 하세요.");
        assertThat(read.attachments()).containsExactly(
                new Attachment("안내문.jpg", "https://atc.hanyang.ac.kr/b/file/down/AaF_t/a.jpg"));
    }

    @Test
    void readsTableBoardDateFromDetailNotTitle() {
        var board = new CommunicationCultureBoard();
        var list = Jsoup.parse("""
                <table><tr><td></td><td>대학원</td>
                <td class="left"><a href="/bbs/board.php?tbl=bbs61&amp;mode=VIEW&amp;num=2270&amp;page=1"> 결과보고서 제출 안내 ~ 12.10(목) </a>
                <div class="pc_none"><span>26.11.02</span></div></td><td class="mob_none">26.11.02</td></tr></table>""",
                board.listUrl());
        var detail = Jsoup.parse("""
                <table class="bbs_view"><tr><th><div class="left">
                <p class="title">[대학원] 2026.12.10까지 제출 안내</p><p class="con">관리자 │ 2026-11-02 </p>
                <p class="con"><a href='/bbs/download.php?tbl=bbs61&no=2404'>붙임1.pdf</a></p></div></th></tr>
                <tr><td><div id="DivContents"><p>보고서를 내 주세요.</p></div></td></tr></table>""", board.listUrl());

        assertThat(board.parseList(list)).singleElement().satisfies(entry -> {
            assertThat(entry.id()).isEqualTo("2270");
            assertThat(entry.label()).isEqualTo("대학원");
            assertThat(entry.title()).isEqualTo("결과보고서 제출 안내 ~ 12.10(목)");
            assertThat(entry.postedAt()).isNull();
        });
        var read = board.parseDetail(detail);
        assertThat(read.postedAt()).isEqualTo(LocalDate.of(2026, 11, 2));
        assertThat(read.content()).isEqualTo("보고서를 내 주세요.");
        assertThat(read.attachments()).containsExactly(
                new Attachment("붙임1.pdf", "https://ccss.hanyang.ac.kr/bbs/download.php?tbl=bbs61&no=2404"));
    }

    @Test
    void readsDesignAttachmentNameBesideDownloadLink() {
        var board = new DesignBoard();
        var list = Jsoup.parse("""
                <div class="bl-list" role="row"><div class="bl-item bl-num">254</div>
                <div class="bl-subj"><a href="http://idesign.hanyang.ac.kr/bbs/board.php?bo_table=notice&amp;wr_id=1526">
                <span class="text-gray m-r-5">[수업]</span> <span class="subj">겨울계절학기 운영 안내</span></a></div>
                <div class="bl-item text-gray"> 2026-10-29 </div></div>""", board.listUrl());
        var detail = Jsoup.parse("""
                <div class="board-view-info"><div class="info-box-bottom"><span>2026-10-29 09:37</span></div></div>
                <div class="board-view-file"><ul><li> - 첨부파일 : <strong>개설과목.xlsx</strong> (30.9K) -
                <a href="http://idesign.hanyang.ac.kr/bbs/download.php?bo_table=notice&amp;wr_id=1526&amp;no=0" class="view_file_download"><u>다운로드</u></a></li></ul></div>
                <div id="board_view_con"><p>운영 일정입니다.</p></div>""", board.listUrl());

        assertThat(board.parseList(list)).singleElement().satisfies(entry -> {
            assertThat(entry.id()).isEqualTo("1526");
            assertThat(entry.label()).isEqualTo("수업");
            assertThat(entry.title()).isEqualTo("겨울계절학기 운영 안내");
            assertThat(entry.postedAt()).isEqualTo(LocalDate.of(2026, 10, 29));
        });
        var read = board.parseDetail(detail);
        assertThat(read.postedAt()).isEqualTo(LocalDate.of(2026, 10, 29));
        assertThat(read.attachments()).extracting(Attachment::name).containsExactly("개설과목.xlsx");
    }

    @Test
    void readsSportsArtsListWithoutPinnedBadge() {
        var board = new SportsArtsBoard();
        var list = Jsoup.parse("""
                <ul><li><a href="board.php?bo_table=notice&amp;idx=589"><div class="date"><div class="md">10.26</div>
                <div class="year">2026</div></div><div class="txts"><div class="sbj"><span class="cate main">주요</span>
                [학부](재입학) 재입학 신청 안내</div></div></a></li></ul>""", board.listUrl());
        var detail = Jsoup.parse("""
                <div class="view"><table><tr><th><div class="sbj">재입학</div><div class="date">2026.10.26</div></th></tr>
                <tr><th class="file"><dl><dd><a href="/board/download.php?bo_table=notice&amp;file_name=a.jpg">안내문.jpg</a></dd></dl></th></tr>
                <tr><td class="viewcon"><p>신청해 주세요.</p></td></tr></table></div>""", board.listUrl());

        assertThat(board.parseList(list)).singleElement().satisfies(entry -> {
            assertThat(entry.id()).isEqualTo("589");
            assertThat(entry.label()).isEqualTo("학부");
            assertThat(entry.title()).isEqualTo("(재입학) 재입학 신청 안내");
            assertThat(entry.postedAt()).isEqualTo(LocalDate.of(2026, 10, 26));
            assertThat(entry.url()).isEqualTo("http://sportsnarts.hanyang.ac.kr/art/board/board.php?bo_table=notice&idx=589");
        });
        var read = board.parseDetail(detail);
        assertThat(read.content()).isEqualTo("신청해 주세요.");
        assertThat(read.attachments()).extracting(Attachment::name).containsExactly("안내문.jpg");
    }

    @Test
    void opensLionsDetailWithListFormToken() {
        var board = new LionsBoard();
        var listHtml = """
                <form method="post" action="./sub5-1.aspx" id="form1">
                <input type="hidden" name="__VIEWSTATE" id="__VIEWSTATE" value="state" />
                <input type="hidden" id="nnumlions" name="nnumlions" value="" />
                <table><tr><td data-label="제목"><a onclick="moveView('2C20AB')">[학적] 재입학 신청 안내</a></td>
                <td data-label="등록일">2026.10.26</td></tr></table></form>""";
        var posted = new java.util.ArrayList<Map<String, String>>();
        var collector = new SchoolNoticeCollector(List.of(board), new SchoolNoticeCollector.HtmlFetcher() {
            @Override
            public org.jsoup.nodes.Document fetch(String url) {
                return Jsoup.parse(listHtml, url);
            }

            @Override
            public org.jsoup.nodes.Document post(String url, Map<String, String> form) {
                posted.add(form);
                return Jsoup.parse("""
                        <span id="wDate">2026.10.26</span><span id="content"><p>재입학을 신청하세요.</p></span>
                        <span id="Downloader_fileList"><a href="/App/System/Common/DownLoadAction.aspx?fN=AB">안내문.pdf</a></span>""", url);
            }
        }, 0);

        var notices = collectAll(collector);

        assertThat(posted).singleElement().satisfies(form -> {
            assertThat(form).containsEntry("nnumlions", "2C20AB").containsEntry("__VIEWSTATE", "state");
        });
        assertThat(notices).singleElement().satisfies(notice -> {
            // 토큰은 목록을 열 때마다 바뀌어 ID는 등록일과 제목으로 만든다.
            assertThat(notice.id()).isEqualTo(String.format("20261026-%08x", "[학적] 재입학 신청 안내".hashCode()));
            assertThat(notice.label()).isEqualTo("학적");
            assertThat(notice.collegeId()).isEqualTo("lions");
            assertThat(notice.content()).isEqualTo("재입학을 신청하세요.");
            assertThat(notice.attachments()).extracting(Attachment::name).containsExactly("안내문.pdf");
            assertThat(notice.url()).isEqualTo(board.listUrl());
        });
    }

    @Test
    void fillsYearOfListDateFromToday() {
        var today = LocalDate.of(2026, 11, 4);

        assertThat(BoardHtml.monthDay("10-23", today)).isEqualTo(LocalDate.of(2026, 10, 23));
        assertThat(BoardHtml.monthDay("12-30", today)).isEqualTo(LocalDate.of(2025, 12, 30));
        assertThat(BoardHtml.monthDay("14:05", today)).isEqualTo(today);
        assertThat(BoardHtml.monthDay("관리자", today)).isNull();
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
        var requested = new java.util.ArrayList<String>();
        var collector = new SchoolNoticeCollector(List.of(global, pharmacy), url -> {
            requested.add(url);
            if (!pages.containsKey(url)) throw new java.io.IOException("unreachable " + url);
            return Jsoup.parse(pages.get(url), url);
        }, 0);

        var listed = collector.collectLists();

        // 목록만 읽은 단계에서는 상세를 요청하지 않고 본문도 비워 둔다.
        assertThat(requested).containsExactlyInAnyOrder(global.listUrl(), pharmacy.listUrl());
        assertThat(listed).singleElement().satisfies(notice -> {
            assertThat(notice.detailRead()).isFalse();
            assertThat(notice.postedAt()).isEqualTo(LocalDate.of(2026, 10, 1));
        });
        assertThat(collectAll(collector)).singleElement().satisfies(notice -> {
            assertThat(notice.boardKey()).isEqualTo("erica-pharmacy");
            assertThat(notice.collegeId()).isEqualTo("pharmacy");
            assertThat(notice.id()).isEqualTo("1");
            assertThat(notice.postedAt()).isEqualTo(LocalDate.of(2026, 10, 1));
            assertThat(notice.content()).isEqualTo("본문");
        });
    }

    @Test
    void failedDetailBecomesEmptyBodyInsteadOfLoading() {
        var pharmacy = new PharmacyBoard();
        var collector = new SchoolNoticeCollector(List.of(pharmacy), url -> {
            if (!url.equals(pharmacy.listUrl())) throw new java.io.IOException("unreachable " + url);
            return Jsoup.parse("""
                    <ul class="board-default-list"><li><a href="/front/information/notice/notice-view?id=1">
                    <span class="subject">일반 공지</span></a></li></ul>""", url);
        }, 0);

        assertThat(collectAll(collector)).singleElement().satisfies(notice -> {
            assertThat(notice.detailRead()).isTrue();
            assertThat(notice.content()).isEmpty();
            assertThat(notice.detailFailed()).isTrue();
        });
    }

    private static List<SchoolNotice> collectAll(SchoolNoticeCollector collector) {
        var read = new java.util.ArrayList<SchoolNotice>();
        collector.collectDetails(collector.collectLists(), read::addAll);
        return read;
    }
}
