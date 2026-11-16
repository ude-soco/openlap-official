package com.openlap.analytics_module.drafts;

import jakarta.servlet.http.HttpServletRequest;
import org.bson.Document;

/** Specialized validation/publication for private community adaptation graphs. */
public interface IndicatorDraftAdaptationLifecycle {
  IndicatorDraftResponse complete(HttpServletRequest request, Document current,
      IndicatorDraftRequests.Complete body);
  IndicatorDraftResponse resume(HttpServletRequest request, Document current);
}
