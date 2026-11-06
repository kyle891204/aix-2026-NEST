package com.aix.team03.notices;

import com.aix.team03.notices.NoticeModels.Notice;
import java.util.List;
import java.util.Optional;

public interface NoticeRepository {
    List<Notice> findAll();

    Optional<Notice> findById(String noticeId);
}
