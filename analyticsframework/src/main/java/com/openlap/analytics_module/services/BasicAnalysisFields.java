package com.openlap.analytics_module.services;

import com.google.gson.Gson;
import com.openlap.analytics_module.entities.Indicator;
import com.openlap.analytics_statements.dtos.request.StatementsRequest;
import com.openlap.dataset.OpenLAPPortConfig;
import com.openlap.infrastructure.exception.ValidationException;
import java.util.Locale;
import java.util.Set;

/** Prevents raw xAPI identity fields from becoming analysis data. */
public final class BasicAnalysisFields {
  private static final Gson GSON = new Gson();
  private static final Set<String> CONTEXT_IDENTITIES = Set.of("instructor", "team", "contextagents", "contextgroups");
  private static final Set<String> OBJECT_IDENTITIES = Set.of("name", "account", "mbox", "mbox_sha1sum", "openid", "member");

  private BasicAnalysisFields() {}

  public static boolean isPrivate(String field) {
    if (field == null || field.isBlank()) return false;
    String[] segments = field.toLowerCase(Locale.ROOT).split("\\.", -1);
    for (int i = 0; i < segments.length; i++) {
      segments[i] = segments[i].strip();
      if (segments[i].isEmpty() || segments[i].startsWith("$")) return true;
    }
    int start = segments[0].equals("statement") ? 1 : 0;
    int part = start;
    while (part < segments.length && segments[part].equals("object")) part++;
    if (part == segments.length) return true;
    String root = segments[part];
    if (root.equals("actor") || root.equals("authority")) return true;
    if (root.equals("context")) {
      return part + 1 == segments.length || CONTEXT_IDENTITIES.contains(segments[part + 1]);
    }
    return part > start && OBJECT_IDENTITIES.contains(root);
  }

  public static void requireAllowed(StatementsRequest query, OpenLAPPortConfig mapping) {
    if (query != null && query.getOutputs() != null) {
      query.getOutputs().forEach(BasicAnalysisFields::requireAllowedField);
    }
    if (mapping != null && mapping.getMapping() != null) {
      mapping.getMapping().forEach(port -> {
        if (port != null && port.getOutputPort() != null) {
          requireAllowedField(port.getOutputPort().getId());
        }
      });
    }
  }

  public static void requireAllowed(Indicator indicator) {
    var reference = indicator.getAnalyticsTechniqueReference();
    requireAllowed(GSON.fromJson(indicator.getIndicatorQuery(), StatementsRequest.class),
        reference == null ? null
            : GSON.fromJson(reference.getQueryToAnalyticsTechniqueMapping(), OpenLAPPortConfig.class));
  }

  private static void requireAllowedField(String field) {
    if (isPrivate(field)) {
      throw new ValidationException("PRIVATE_ANALYSIS_INPUT",
          "Choose an activity, action, or another analysis input without learner identifiers.");
    }
  }
}
