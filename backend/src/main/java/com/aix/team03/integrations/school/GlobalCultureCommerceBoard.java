package com.aix.team03.integrations.school;

import com.aix.team03.integrations.school.SchoolNoticeModels.BoardKind;
import org.springframework.stereotype.Component;

/** 글로벌문화통상대학 공지. */
@Component
public class GlobalCultureCommerceBoard extends BbsTableBoard {
    @Override public String key() { return "erica-global-culture-commerce"; }
    @Override public BoardKind kind() { return BoardKind.COLLEGE; }
    @Override public String name() { return "글로벌문화통상대학"; }
    @Override public String collegeId() { return "global-culture-commerce"; }
    @Override public String listUrl() { return "https://lan-cul.hanyang.ac.kr/bbs/board.php?tbl=bbs71"; }
}
