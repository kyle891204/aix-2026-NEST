package com.aix.team03.notices;

import com.aix.team03.matching.MatchingModels.AnalysisStatus;
import com.aix.team03.matching.MatchingModels.TargetConditions;
import java.util.List;

public final class NoticeModels {
    private NoticeModels() {}

    public enum Source { UNIVERSITY, INTERNATIONAL, COLLEGE }

    /** 대시보드(#6)와 같은 공지 분류. */
    public enum Category { VISA, SCHOLARSHIP, ACADEMIC, EVENT, ETC }

    /**
     * postedAt은 게시일(yyyy-MM-dd)이며 게시판에서 읽지 못하면 null이다. sourceName은 공지를 올린 곳의 이름이다.
     * collegeId가 있으면 그 단과대 학생에게만 보여주고, null이면 ERICA 전체 공지다.
     * 목록 필드가 비어 있으면 빈 목록으로 바꿔 화면이 null을 다루지 않게 한다.
     */
    public record Notice(String noticeId, Source source, String sourceName, String collegeId, Category category,
            String title,
            String postedAt, AnalysisStatus analysisStatus, String deadline, String target,
            TargetConditions targetConditions, List<Action> actions, List<String> documents,
            List<Attachment> attachments, String originalContent, String originalLanguage, String sourceUrl,
            boolean sample) {
        public Notice {
            category = category == null ? Category.ETC : category;
            actions = actions == null ? List.of() : actions;
            documents = documents == null ? List.of() : documents;
            attachments = attachments == null ? List.of() : attachments;
        }
    }

    public record Action(String id, String text) {}

    public record Attachment(String name, String url) {}
}
