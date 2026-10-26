package com.aix.team03.auth;

import java.io.Serializable;

/** A verified Google identity for this session; not a persisted NEST membership. */
public record AuthUser(String id, String email) implements Serializable {}
