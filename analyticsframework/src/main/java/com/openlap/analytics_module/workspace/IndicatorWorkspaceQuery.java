package com.openlap.analytics_module.workspace;

import com.openlap.analytics_module.entities.utility_entities.IndicatorType;
import com.openlap.infrastructure.exception.ValidationException;
import java.util.Locale;
import java.util.Set;

public record IndicatorWorkspaceQuery(
    int page,
    int size,
    String search,
    String indicatorType,
    boolean draftsOnly,
    String sortBy,
    boolean descending) {
  public static IndicatorWorkspaceQuery checked(
      int page,
      int size,
      String search,
      String indicatorType,
      boolean draftsOnly,
      String sortBy,
      String direction) {
    if (page < 0
        || page > 1000000
        || size < 1
        || size > 100
        || search == null
        || search.length() > 300)
      throw new ValidationException("Invalid workspace pagination or search.");
    if (!Set.of("name", "indicatorType", "updatedAt", "status").contains(sortBy))
      throw new ValidationException("Invalid workspace sort column.");
    if (direction == null || !Set.of("asc", "desc").contains(direction.toLowerCase(Locale.ROOT)))
      throw new ValidationException("Invalid workspace sort direction.");
    String type = indicatorType == null || indicatorType.isBlank() ? null : indicatorType;
    if (type != null)
      try {
        IndicatorType.valueOf(type);
      } catch (IllegalArgumentException error) {
        throw new ValidationException("Invalid indicator type.");
      }
    return new IndicatorWorkspaceQuery(
        page, size, search.strip(), type, draftsOnly, sortBy, "desc".equalsIgnoreCase(direction));
  }
}
