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
    boolean completionPending,
    boolean communityCopy,
    boolean communityDependency,
    boolean communityAdapted) {
  public IndicatorWorkspaceRow(String id, String kind, String status, String name,
      String indicatorType, Instant createdAt, Instant updatedAt, Long revision,
      String sourceIndicatorId, Boolean recoverable, boolean completionPending,
      boolean communityCopy, boolean communityDependency) {
    this(id, kind, status, name, indicatorType, createdAt, updatedAt, revision,
        sourceIndicatorId, recoverable, completionPending, communityCopy, communityDependency, false);
  }
  public IndicatorWorkspaceRow(String id, String kind, String status, String name,
      String indicatorType, Instant createdAt, Instant updatedAt, Long revision,
      String sourceIndicatorId, Boolean recoverable, boolean completionPending) {
    this(id, kind, status, name, indicatorType, createdAt, updatedAt, revision,
        sourceIndicatorId, recoverable, completionPending, false, false, false);
  }
}
