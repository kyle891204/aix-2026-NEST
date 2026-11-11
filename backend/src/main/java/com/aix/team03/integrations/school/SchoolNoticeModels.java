package com.aix.team03.integrations.school;

import java.time.LocalDate;
import java.util.List;

public final class SchoolNoticeModels {
    private SchoolNoticeModels() {}

    public enum BoardKind { UNIVERSITY, INTERNATIONAL, COLLEGE }

    public record Attachment(String name, String url) {}

    /** 게시판 목록의 한 줄. label은 게시판이 붙인 분류(대학원·기숙사 등)이고, 목록에 날짜가 없으면 postedAt은 null이다. */
    public record ListEntry(String id, String url, String label, String title, LocalDate postedAt) {}

    /** failed는 상세 페이지를 읽지 못한 것이다. 본문이 이미지뿐인 상세와 구분한다. */
    public record Detail(String content, LocalDate postedAt, List<Attachment> attachments, boolean failed) {
        public Detail(String content, LocalDate postedAt, List<Attachment> attachments) {
            this(content, postedAt, attachments, false);
        }

        public static Detail unreadable() { return new Detail("", null, List.of(), true); }
    }

    /**
     * 게시판에서 읽은 공지 원본. id는 게시판 안에서 고정된 글 번호다. postedAt은 끝내 읽지 못하면 null이다.
     * collegeId는 단과대 공지면 그 단과대 ID, ERICA 전체 공지면 null이다.
     * content는 목록만 읽고 상세를 아직 읽지 않았으면 null이고, 상세가 이미지뿐이거나 읽지 못했으면 빈 문자열이다.
     * detailFailed는 상세 페이지를 읽지 못해 본문이 빈 경우다.
     */
    public record SchoolNotice(String boardKey, BoardKind kind, String boardName, String collegeId, String id,
            String label,
            String title, LocalDate postedAt, String url, String content, List<Attachment> attachments,
            boolean detailFailed) {
        public SchoolNotice(String boardKey, BoardKind kind, String boardName, String collegeId, String id,
                String label, String title, LocalDate postedAt, String url, String content,
                List<Attachment> attachments) {
            this(boardKey, kind, boardName, collegeId, id, label, title, postedAt, url, content, attachments, false);
        }

        public boolean detailRead() { return content != null; }
    }
}
