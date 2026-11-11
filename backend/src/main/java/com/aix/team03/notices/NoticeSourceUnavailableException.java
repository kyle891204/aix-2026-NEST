package com.aix.team03.notices;

/**
 * 학교 게시판을 하나도 읽지 못해 보여줄 공지가 없다. 전체공지(#8)와 대시보드(#6)가 같은 공지를 쓰므로
 * GlobalExceptionHandler가 두 API 모두 503으로 응답한다.
 */
public class NoticeSourceUnavailableException extends RuntimeException {}
