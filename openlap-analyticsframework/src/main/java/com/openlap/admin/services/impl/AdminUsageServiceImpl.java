package com.openlap.admin.services.impl;

import com.mongodb.DBRef;
import com.openlap.admin.dto.AdminUsageResponse;
import com.openlap.admin.dto.UsageCount;
import com.openlap.admin.services.AdminUsageService;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminUsageServiceImpl implements AdminUsageService {

  static final String INDICATOR_COLLECTION = "analytics-indicator";

  private final MongoTemplate mongoTemplate;

  @Override
  public AdminUsageResponse getUsage() {
    List<Document> indicators = mongoTemplate.findAll(Document.class, INDICATOR_COLLECTION);
    log.info("Computing admin usage over {} saved indicators", indicators.size());
    return computeUsage(indicators);
  }

  /**
   * Tallies usage from raw indicator documents. Reads the stored DBRef {@code $id}s
   * directly (no dereference of the target documents), so dangling references to
   * deleted methods/types/libraries are still counted by id and never throw, and
   * there is no N+1 lazy-load. Null/missing references — e.g. composite indicators
   * carry no analytics method, and legacy/incomplete records — are skipped.
   */
  static AdminUsageResponse computeUsage(List<Document> indicators) {
    Map<String, Tally> libraries = new HashMap<>();
    Map<String, Tally> types = new HashMap<>();
    Map<String, Tally> methods = new HashMap<>();

    for (Document indicator : indicators) {
      if (indicator == null) {
        continue;
      }
      String userId = refId(indicator.get("createdBy"));

      Document visRef = asDocument(indicator.get("visualizationTechniqueReference"));
      if (visRef != null) {
        tally(libraries, refId(visRef.get("visLibrary")), userId);
        tally(types, refId(visRef.get("visType")), userId);
      }

      Document analysisRef = asDocument(indicator.get("analyticsTechniqueReference"));
      if (analysisRef != null) {
        tally(methods, refId(analysisRef.get("analyticsTechnique")), userId);
      }
    }

    return new AdminUsageResponse(toList(libraries), toList(types), toList(methods));
  }

  private static void tally(Map<String, Tally> counts, String id, String userId) {
    if (id == null) {
      return;
    }
    Tally tally = counts.computeIfAbsent(id, key -> new Tally());
    tally.indicatorCount++;
    if (userId != null) {
      tally.users.add(userId);
    }
  }

  /**
   * Extracts the referenced id from a stored DBRef field. Handles both
   * representations a raw read can yield: a {@link DBRef} (driver-decoded) or a
   * {@code {$ref,$id}} {@link Document}. Returns null for anything else.
   */
  private static String refId(Object dbRefField) {
    if (dbRefField instanceof DBRef) {
      Object id = ((DBRef) dbRefField).getId();
      return id == null ? null : id.toString();
    }
    if (dbRefField instanceof Document) {
      Object id = ((Document) dbRefField).get("$id");
      return id == null ? null : id.toString();
    }
    return null;
  }

  private static Document asDocument(Object value) {
    return value instanceof Document ? (Document) value : null;
  }

  private static List<UsageCount> toList(Map<String, Tally> counts) {
    List<UsageCount> result = new ArrayList<>();
    counts.forEach(
        (id, tally) -> result.add(new UsageCount(id, tally.indicatorCount, tally.users.size())));
    return result;
  }

  /** Mutable accumulator: indicator count + the set of distinct creator ids. */
  private static final class Tally {
    private int indicatorCount;
    private final Set<String> users = new HashSet<>();
  }
}
