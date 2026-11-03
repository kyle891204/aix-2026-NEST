package com.aix.team03.integrations.school;

import com.aix.team03.integrations.school.SchoolNoticeModels.BoardKind;
import com.aix.team03.integrations.school.SchoolNoticeModels.Detail;
import com.aix.team03.integrations.school.SchoolNoticeModels.ListEntry;
import java.util.List;
import org.jsoup.nodes.Document;

/** 공개 공지 게시판 하나. 사이트마다 HTML이 달라 게시판별로 목록과 상세를 읽는 방법만 구현한다. */
public interface SchoolBoard {
    /** 공지 ID 앞에 붙는 고정 키. 바꾸면 저장된 체크 상태와 일정 연결이 끊어진다. */
    String key();

    BoardKind kind();

    String name();

    /** 단과대 게시판이면 프로필의 단과대 ID(computing 등), ERICA 전체 게시판이면 null이다. */
    default String collegeId() { return null; }

    String listUrl();

    List<ListEntry> parseList(Document list);

    Detail parseDetail(Document detail);
}
