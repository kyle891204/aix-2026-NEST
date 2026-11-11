package com.aix.team03.dashboard;

import com.aix.team03.dashboard.DashboardModels.TargetedNotice;
import java.util.List;

/** 대시보드가 판별할 공지를 받는 창구. collegeId가 있으면 ERICA 전체 공지와 그 단과대 공지를 준다. */
public interface NoticeSource {
    List<TargetedNotice> notices(String collegeId);
}
