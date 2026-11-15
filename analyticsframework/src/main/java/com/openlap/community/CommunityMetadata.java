package com.openlap.community;

import com.openlap.analytics_module.entities.Indicator;
import com.openlap.isc_module.entities.IndicatorSpecificationCard;
import java.util.*;
import org.bson.Document;

/** Indexed metadata contains only the same public text exposed by catalog responses. */
public final class CommunityMetadata {
  public static final int VERSION = 2;
  private CommunityMetadata() {}

  public static void populate(Indicator source, Document target) {
    var technique = source.getAnalyticsTechniqueReference();
    // Composite definitions inherit their common method from the Basic sources.
    if (technique == null && source.getIndicators() != null && !source.getIndicators().isEmpty()) {
      var first = source.getIndicators().get(0);
      if (first != null && first.getIndicator() != null)
        technique = first.getIndicator().getAnalyticsTechniqueReference();
    }
    String method = technique != null && technique.getAnalyticsTechnique() != null
        ? technique.getAnalyticsTechnique().getName() : "";
    String chart = source.getVisualizationTechniqueReference() != null
        && source.getVisualizationTechniqueReference().getVisType() != null
        ? source.getVisualizationTechniqueReference().getVisType().getName() : "";
    target.put("communityMetadata", new Document("schemaVersion", VERSION)
        .append("name", CommunitySanitizer.publicName(source))
        .append("type", source.getIndicatorType() == null ? "BASIC" : source.getIndicatorType().name())
        .append("method", CommunitySanitizer.text(method, source.getCreatedBy(), ""))
        .append("chart", CommunitySanitizer.text(chart, source.getCreatedBy(), ""))
        .append("goal", "")
        .append("updatedAt", target.getOrDefault("createdOn", new Date())));
  }

  public static void populate(IndicatorSpecificationCard source, Document target) {
    var requirements = CommunitySanitizer.object(CommunitySanitizer.parse(source.getRequirements()));
    var goal = CommunitySanitizer.object(requirements.get("goalType"));
    var vis = CommunitySanitizer.object(CommunitySanitizer.parse(source.getVisRef()));
    String name = source.getIndicatorName();
    if (name == null || name.isBlank()) name = CommunitySanitizer.string(requirements, "indicatorName");
    target.put("communityMetadata", new Document("schemaVersion", VERSION)
        .append("name", CommunitySanitizer.text(name, source.getCreatedBy(), "Learning indicator specification"))
        .append("type", "ISC")
        .append("method", "")
        .append("chart", CommunitySanitizer.text(CommunitySanitizer.string(vis.get("chart"), "type"), source.getCreatedBy(), ""))
        .append("goal", CommunitySanitizer.text(CommunitySanitizer.string(goal, "category"), source.getCreatedBy(), ""))
        .append("updatedAt", target.getOrDefault("updatedOn", target.getOrDefault("createdOn", new Date()))));
  }
}
