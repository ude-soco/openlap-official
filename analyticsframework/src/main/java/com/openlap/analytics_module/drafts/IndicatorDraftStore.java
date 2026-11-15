package com.openlap.analytics_module.drafts;

import org.bson.Document;
import org.springframework.data.domain.Page;

/** Atomic persistence boundary; all writes include ownership, revision and lifecycle checks. */
public interface IndicatorDraftStore {
  String COLLECTION = "analytics-indicator-drafts";

  Document find(String owner, String id);

  Document findActiveEdit(String owner, String sourceId);

  boolean insert(Document document);

  boolean replace(String owner, Document previous, Document replacement);

  Page<Document> list(
      String owner,
      int page,
      int size,
      String search,
      String type,
      String sortBy,
      boolean descending);
}
