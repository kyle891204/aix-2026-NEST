package com.aix.team03.global.error;

import java.util.Map;

public record ApiError(String code, String message, Map<String, String> fields) {}
