package com.aix.team03.dashboard;

import com.aix.team03.dashboard.DashboardModels.TargetedNotice;
import com.aix.team03.notices.NoticeService;
import java.util.List;
import org.springframework.stereotype.Component;

/** #8 공지 저장소의 공지를 대시보드에 넘긴다. 전체공지(S06)와 같은 공지·단과대 규칙·분석 결과를 쓴다. */
@Component
public class CollectedNoticeSource implements NoticeSource {
    private final NoticeService notices;

    public CollectedNoticeSource(NoticeService notices) { this.notices = notices; }

    @Override
    public List<TargetedNotice> notices(String collegeId) {
        return notices.visibleNotices(collegeId).stream()
                .map(notice -> new TargetedNotice(notice.noticeId(), notice.title(), notice.category().name(),
                        notice.postedAt(), notice.deadline(), notice.sourceUrl(), notice.targetConditions(),
                        notice.analysisStatus()))
                .toList();
    }
}
