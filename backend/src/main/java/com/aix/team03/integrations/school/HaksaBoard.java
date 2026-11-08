package com.aix.team03.integrations.school;

import com.aix.team03.integrations.school.SchoolNoticeModels.BoardKind;
import org.springframework.stereotype.Component;

/** ERICA 학사 공지. 단과대와 관계없이 모든 학생에게 보인다. */
@Component
public class HaksaBoard extends LiferayBoard {
    @Override public String key() { return "erica-haksa"; }
    @Override public BoardKind kind() { return BoardKind.UNIVERSITY; }
    @Override public String name() { return "ERICA 학사"; }
    @Override public String listUrl() { return "https://ehaksa.hanyang.ac.kr/notice"; }
}
