package com.aix.team03.notices;

import com.aix.team03.matching.MatchingModels.AnalysisStatus;
import com.aix.team03.matching.MatchingModels.TargetConditions;
import java.util.List;

public final class NoticeModels {
    private NoticeModels() {}

    public enum Source { UNIVERSITY, INTERNATIONAL, COLLEGE }

    public record Notice(String noticeId, Source source, String title, AnalysisStatus analysisStatus,
            String deadline, String target, TargetConditions targetConditions, List<Action> actions,
            List<String> documents, String originalContent, String originalLanguage, String sourceUrl,
            boolean sample) {}

    public record Action(String id, String text) {}
}
