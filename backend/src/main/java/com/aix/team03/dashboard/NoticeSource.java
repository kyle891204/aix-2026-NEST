package com.aix.team03.dashboard;

import com.aix.team03.dashboard.DashboardModels.TargetedNotice;
import java.util.List;

/** 대시보드가 판별할 공지를 받는 창구. #8 공지 저장소가 준비되면 그 구현으로 바꾼다. */
public interface NoticeSource {
    List<TargetedNotice> notices();
}
