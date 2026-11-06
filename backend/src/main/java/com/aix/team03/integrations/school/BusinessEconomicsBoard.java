package com.aix.team03.integrations.school;

import com.aix.team03.integrations.school.SchoolNoticeModels.BoardKind;
import org.springframework.stereotype.Component;

/** 경상대학 공지. */
@Component
public class BusinessEconomicsBoard extends LiferayBoard {
    @Override public String key() { return "erica-business-economics"; }
    @Override public BoardKind kind() { return BoardKind.COLLEGE; }
    @Override public String name() { return "경상대학"; }
    @Override public String collegeId() { return "business-economics"; }
    @Override public String listUrl() { return "https://cbe.hanyang.ac.kr/-05-1"; }
}
