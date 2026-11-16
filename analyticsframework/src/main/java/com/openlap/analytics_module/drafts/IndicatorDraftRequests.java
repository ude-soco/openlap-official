package com.openlap.analytics_module.drafts;

import com.fasterxml.jackson.databind.JsonNode;
import com.openlap.analytics_module.entities.utility_entities.IndicatorType;
import jakarta.validation.constraints.*;

/** Authoring documents are partial configurations, never runnable indicator definitions. */
public final class IndicatorDraftRequests {
  private IndicatorDraftRequests() {}

  public record Create(
      @NotBlank String clientRequestId,
      @NotNull IndicatorType indicatorType,
      @Size(max = 300) String name,
      @NotNull JsonNode configuration,
      @NotNull Integer schemaVersion,
      @Size(max = 200) String adaptationSourceDraftId) {
    public Create(String clientRequestId, IndicatorType indicatorType, String name,
        JsonNode configuration, Integer schemaVersion) {
      this(clientRequestId, indicatorType, name, configuration, schemaVersion, null);
    }
  }

  public record Update(
      @NotNull @Min(0) Long revision,
      @Size(max = 300) String name,
      @NotNull JsonNode configuration,
      @NotNull Integer schemaVersion,
      String clientRequestId) {}

  public record Complete(@NotNull @Min(0) Long revision, @NotNull JsonNode indicator) {}
}
