package com.aix.team03.integrations.school;

import com.aix.team03.integrations.school.SchoolNoticeModels.BoardKind;
import org.springframework.stereotype.Component;

/** 공학대학 공지. */
@Component
public class EngineeringBoard extends LiferayBoard {
    @Override public String key() { return "erica-engineering"; }
    @Override public BoardKind kind() { return BoardKind.COLLEGE; }
    @Override public String name() { return "공학대학"; }
    @Override public String collegeId() { return "engineering"; }
    @Override public String listUrl() { return "https://ieng.hanyang.ac.kr/-2"; }
}
