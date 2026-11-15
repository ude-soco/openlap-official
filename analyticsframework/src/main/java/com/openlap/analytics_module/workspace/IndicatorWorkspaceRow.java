package com.openlap.analytics_module.workspace;

import java.time.Instant;

/** Private dashboard metadata only; no configuration, records, contracts or executable code. */
public record IndicatorWorkspaceRow(
    String id,
    String kind,
    String status,
    String name,
    String indicatorType,
    Instant createdAt,
    Instant updatedAt,
    Long revision,
    String sourceIndicatorId,
    Boolean recoverable,
    boolean completionPending) {}
