package com.openlap.analytics_module.services.impl;

import com.google.gson.JsonParser;
import com.openlap.analytics_module.entities.utility_entities.IndicatorType;
import com.openlap.infrastructure.exception.ValidationException;

/** Recovery JSON is bounded editor configuration, never the authoritative executable definition. */
final class ComplexIndicatorConfiguration {
  private ComplexIndicatorConfiguration() {}

  static void validate(String configuration, IndicatorType type) {
    if (configuration == null || configuration.length() > 1048576) throw invalid();
    try {
      var value = JsonParser.parseString(configuration);
      if (!value.isJsonObject()) throw invalid();
      var object = value.getAsJsonObject();
      if (!object.has("type") || !type.name().equals(object.get("type").getAsString())) throw invalid();
    } catch (RuntimeException error) {
      throw invalid();
    }
  }

  private static ValidationException invalid() {
    return new ValidationException("INVALID_INDICATOR_CONFIGURATION", "The editor configuration is invalid. Reopen the correct indicator editor and try again.");
  }
}
