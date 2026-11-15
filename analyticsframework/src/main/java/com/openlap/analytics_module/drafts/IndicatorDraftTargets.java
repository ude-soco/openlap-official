package com.openlap.analytics_module.drafts;

import com.openlap.analytics_module.entities.Indicator;
import org.bson.Document;

/** Atomic target publication, separate from the partial authoring document. */
public interface IndicatorDraftTargets {
  Document snapshot(String owner, String indicatorId);
  String fingerprint(Document snapshot);
  default boolean recover(String owner, Document draft, String completionHash) { return false; }
  void publish(String owner, Document draft, Indicator indicator, String completionHash);
}
