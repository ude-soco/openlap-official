package com.openlap.analytics_module.drafts;

import com.fasterxml.jackson.databind.JsonNode;
import com.openlap.analytics_module.entities.utility_entities.IndicatorType;
import java.time.Instant;

public record IndicatorDraftResponse(String id, IndicatorType indicatorType, String name,
    JsonNode configuration, int schemaVersion, long revision, String sourceIndicatorId,
    String sourceRevision, Instant createdAt, Instant updatedAt, String status,
    String savedIndicatorId, boolean recoverable, boolean completionPending) {}
