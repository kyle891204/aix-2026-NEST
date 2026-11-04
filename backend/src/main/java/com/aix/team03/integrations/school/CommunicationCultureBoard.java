package com.aix.team03.integrations.school;

import com.aix.team03.integrations.school.SchoolNoticeModels.BoardKind;
import org.springframework.stereotype.Component;

/** 커뮤니케이션&컬처대학 공지. */
@Component
public class CommunicationCultureBoard extends BbsTableBoard {
    @Override public String key() { return "erica-communication-culture"; }
    @Override public BoardKind kind() { return BoardKind.COLLEGE; }
    @Override public String name() { return "커뮤니케이션&컬처대학"; }
    @Override public String collegeId() { return "communication-culture"; }
    @Override public String listUrl() { return "https://ccss.hanyang.ac.kr/bbs/board.php?tbl=bbs61"; }
}
