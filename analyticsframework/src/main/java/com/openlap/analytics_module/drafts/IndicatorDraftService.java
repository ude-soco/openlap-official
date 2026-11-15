package com.openlap.analytics_module.drafts;

import com.fasterxml.jackson.databind.*;
import com.openlap.analytics_module.entities.Indicator;
import com.openlap.analytics_module.entities.utility_entities.IndicatorType;
import com.openlap.analytics_module.services.impl.IndicatorDraftDefinitionService;
import com.openlap.infrastructure.exception.*;
import com.openlap.user.services.TokenService;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;

/**
 * Private versioned authoring lifecycle. Partial drafts are never executed or included in catalogs.
 */
@Service
@RequiredArgsConstructor
public class IndicatorDraftService {
  private final IndicatorDraftStore store;
  private final IndicatorDraftTargets targets;
  private final IndicatorDraftDefinitionService definitions;
  private final IndicatorDraftConfiguration configurations;
  private final ObjectMapper mapper;
  private final TokenService tokens;

  private String owner(HttpServletRequest request) {
    return tokens.getUserFromToken(request).getId();
  }

  private static String name(String value) {
    String result = value == null ? "" : value.strip();
    if (result.length() > 300)
      throw new ValidationException("Draft names can contain at most 300 characters.");
    return result.isEmpty() ? "Untitled indicator" : result;
  }

  private static String uuid(String value) {
    try {
      if (!UUID.fromString(value).toString().equalsIgnoreCase(value))
        throw new IllegalArgumentException();
      return value.toLowerCase(Locale.ROOT);
    } catch (RuntimeException error) {
      throw new ValidationException(
          "INVALID_DRAFT_REQUEST_ID", "A valid client request UUID is required.");
    }
  }

  private static long revision(Document doc) {
    return ((Number) doc.getOrDefault("revision", 0L)).longValue();
  }

  private static IndicatorType type(Document doc) {
    return IndicatorType.valueOf(doc.getString("indicatorType"));
  }

  private Document configuration(JsonNode value) {
    return Document.parse(value.toString());
  }

  private JsonNode configuration(Document doc) {
    return mapper.valueToTree(doc.get("configuration"));
  }

  private Document required(String owner, String id) {
    Document found = store.find(owner, id);
    if (found == null)
      throw new NotFoundException("DRAFT_NOT_FOUND", "This draft is not available.");
    return migrate(owner, found);
  }

  private Document migrate(String owner, Document old) {
    if (old.containsKey("ownerId")) return old;
    Document migrated = new Document(old);
    JsonNode recovered = configurations.legacy(old.getString("session"), type(old));
    migrated.put("ownerId", owner);
    migrated.put("schemaVersion", 1);
    migrated.put("revision", 0L);
    migrated.put("status", "DRAFT");
    migrated.put(
        "name",
        recovered == null
            ? "Unrecoverable legacy draft"
            : name(
                type(old) == IndicatorType.BASIC
                    ? recovered.path("indicator").path("indicatorName").asText()
                    : recovered.path("name").asText()));
    Object previousTime = old.get("lastUpdated");
    Date timestamp = previousTime instanceof Date ? (Date) previousTime : new Date();
    migrated.put("createdAt", timestamp);
    migrated.put("updatedAt", timestamp);
    migrated.put("recoverable", recovered != null);
    if (recovered != null) migrated.put("configuration", configuration(recovered));
    else if (old.get("session") != null) migrated.put("legacyRecovery", old.get("session"));
    migrated.remove("session");
    migrated.remove("route");
    if (store.replace(owner, old, migrated)) return migrated;
    Document current = store.find(owner, old.get("_id").toString());
    if (current == null || !current.containsKey("ownerId")) throw conflict();
    return current;
  }

  private Document fresh(
      String owner, String id, IndicatorType type, String name, JsonNode configuration) {
    Date now = new Date();
    return new Document("_id", id)
        .append("ownerId", owner)
        .append("indicatorType", type.name())
        .append("name", name(name))
        .append("configuration", configuration(configuration))
        .append("schemaVersion", 1)
        .append("revision", 0L)
        .append("status", "DRAFT")
        .append("createdAt", now)
        .append("updatedAt", now)
        .append("recoverable", true);
  }

  public IndicatorDraftResponse create(
      HttpServletRequest request, IndicatorDraftRequests.Create body) {
    String owner = owner(request), requestId = uuid(body.clientRequestId());
    JsonNode config =
        configurations.validate(body.configuration(), body.indicatorType(), body.schemaVersion());
    String id = "draft-" + configurations.hash(mapper.valueToTree(List.of(owner, requestId)));
    Document existing = store.find(owner, id);
    if (existing != null) return response(existing);
    Document draft = fresh(owner, id, body.indicatorType(), body.name(), config);
    draft.put("clientRequestId", requestId);
    if (!store.insert(draft)) draft = required(owner, id);
    return response(draft);
  }

  public IndicatorDraftResponse get(HttpServletRequest request, String id) {
    return response(required(owner(request), id));
  }

  public Page<IndicatorDraftResponse> list(
      HttpServletRequest request,
      int page,
      int size,
      String search,
      String indicatorType,
      String sortBy,
      String sortDirection) {
    if (page < 0 || page > 1000000 || size < 1 || size > 100 || search.length() > 300)
      throw new ValidationException("Invalid draft pagination or search.");
    if (!Set.of("name", "updatedAt", "createdAt", "indicatorType").contains(sortBy))
      throw new ValidationException("Invalid draft sort column.");
    if (!Set.of("asc", "desc").contains(sortDirection.toLowerCase(Locale.ROOT)))
      throw new ValidationException("Invalid draft sort direction.");
    if (indicatorType != null && !indicatorType.isBlank())
      try {
        IndicatorType.valueOf(indicatorType);
      } catch (IllegalArgumentException error) {
        throw new ValidationException("Invalid indicator type.");
      }
    String owner = owner(request);
    return store
        .list(
            owner,
            page,
            size,
            search,
            indicatorType == null || indicatorType.isBlank() ? null : indicatorType,
            sortBy,
            "desc".equalsIgnoreCase(sortDirection))
        .map(doc -> response(migrate(owner, doc), false));
  }

  public IndicatorDraftResponse update(
      HttpServletRequest request, String id, IndicatorDraftRequests.Update body) {
    String owner = owner(request);
    Document current = required(owner, id);
    requireActive(current);
    JsonNode config =
        configurations.validate(body.configuration(), type(current), body.schemaVersion());
    String requestId = body.clientRequestId() == null ? null : uuid(body.clientRequestId());
    String hash = configurations.hash(mapper.valueToTree(List.of(name(body.name()), config)));
    if (requestId != null && requestId.equals(current.getString("lastMutationId"))) {
      if (!hash.equals(current.getString("lastMutationHash"))) throw conflict();
      return response(current);
    }
    if (revision(current) != body.revision()) throw conflict();
    Document next = new Document(current);
    next.put("name", name(body.name()));
    next.put("configuration", configuration(config));
    next.put("revision", revision(current) + 1);
    next.put("updatedAt", new Date());
    next.put("recoverable", true);
    next.remove("session");
    next.remove("legacyRecovery");
    next.remove("route");
    next.remove("lastMutationId");
    next.remove("lastMutationHash");
    if (requestId != null) {
      next.put("lastMutationId", requestId);
      next.put("lastMutationHash", hash);
    }
    if (!store.replace(owner, current, next)) {
      Document latest = required(owner, id);
      if (requestId != null
          && requestId.equals(latest.getString("lastMutationId"))
          && hash.equals(latest.getString("lastMutationHash"))
          && "DRAFT".equals(latest.getString("status"))) return response(latest);
      throw conflict();
    }
    return response(next);
  }

  public IndicatorDraftResponse discard(HttpServletRequest request, String id, long expected) {
    String owner = owner(request);
    Document current = required(owner, id);
    if ("DISCARDED".equals(current.getString("status")) && revision(current) == expected + 1)
      return response(current);
    requireActive(current);
    if (expected != revision(current)) throw conflict();
    Document receipt = terminal(current, "DISCARDED", null);
    if (!store.replace(owner, current, receipt)) throw conflict();
    return response(receipt);
  }

  public IndicatorDraftResponse edit(HttpServletRequest request, String sourceId) {
    String owner = owner(request);
    // Ownership is rechecked even when an old edit draft exists.
    Document source = targets.snapshot(owner, sourceId);
    sourceId = source.get("_id").toString();
    Document existing = store.findActiveEdit(owner, sourceId);
    if (existing != null) return response(existing);
    IndicatorType type = IndicatorType.valueOf(source.getString("indicatorType"));
    JsonNode config = configurations.legacy(source.getString("configurationRequest"), type);
    if (config == null)
      throw new ValidationException(
          "UNSUPPORTED_SAVED_CONFIGURATION",
          "This saved indicator does not contain a supported editor configuration. It can still be"
              + " previewed.");
    Document draft =
        fresh(owner, "draft-" + UUID.randomUUID(), type, source.getString("name"), config);
    draft.put("sourceIndicatorId", sourceId);
    draft.put("sourceRevision", targets.fingerprint(source));
    draft.put("sourceSnapshot", source);
    draft.put("activeSourceKey", owner + ":" + sourceId);
    if (!store.insert(draft)) {
      draft = store.findActiveEdit(owner, sourceId);
      if (draft == null) throw conflict();
    }
    return response(draft);
  }

  public IndicatorDraftResponse complete(
      HttpServletRequest request, String id, IndicatorDraftRequests.Complete body) {
    String owner = owner(request);
    Document current = required(owner, id);
    if (body.indicator() == null
        || body.indicator().toString().length() > 2 * IndicatorDraftConfiguration.MAX_BYTES)
      throw new ValidationException("Invalid indicator definition.");
    String hash = configurations.hash(body.indicator());
    String status = current.getString("status");
    if ("COMPLETED".equals(status)) {
      if (!hash.equals(current.getString("completionHash"))
          || !matchesCompletionRevision(current, body.revision())) throw conflict();
      return response(current);
    }
    if ("COMPLETING".equals(status)) {
      if (!hash.equals(current.getString("completionHash"))
          || !matchesCompletionRevision(current, body.revision())) throw finalizing();
    } else {
      requireActive(current);
      if (revision(current) != body.revision()) throw conflict();
    }
    // A committed target is recovered before plugin validation: a lost response must not rerun
    // code or fail merely because a plugin was disabled after the successful save.
    if ("COMPLETING".equals(status) && targets.recover(owner, current, hash))
      return completeReceipt(owner, id, current, hash);
    Indicator indicator = definitions.prepare(request, type(current), body.indicator());
    if (!"COMPLETING".equals(status)) {
      Document claim = new Document(current);
      claim.put("status", "COMPLETING");
      claim.put("completionHash", hash);
      claim.put("completionRevision", body.revision());
      claim.put("completionClaimRevision", revision(current) + 1);
      // JSON text preserves exact parameter values without BSON extended-JSON normalization.
      claim.put("completionPayload", body.indicator().toString());
      claim.put(
          "targetIndicatorId",
          current.getString("targetIndicatorId") != null
              ? current.getString("targetIndicatorId")
              : current.getString("sourceIndicatorId") == null
                  ? new ObjectId().toHexString()
                  : current.getString("sourceIndicatorId"));
      claim.put("revision", revision(current) + 1);
      claim.put("updatedAt", new Date());
      if (!store.replace(owner, current, claim)) return complete(request, id, body);
      current = claim;
    }
    try {
      targets.publish(owner, current, indicator, hash);
    } catch (ConflictException error) {
      // A proven source conflict performed no target write. Preserve an editable draft.
      Document released = new Document(current);
      released.put("status", "DRAFT");
      released.put("updatedAt", new Date());
      released.remove("completionHash");
      released.remove("completionRevision");
      released.remove("completionClaimRevision");
      released.remove("completionPayload");
      // The reserved identity is never reused for a different target, even after a conflict.
      // A retry cannot create a second indicator after an uncertain previous publication.
      store.replace(owner, current, released);
      throw error;
    }
    return completeReceipt(owner, id, current, hash);
  }

  /** Resume the exact previously validated definition, independent of refreshed client catalogs. */
  public IndicatorDraftResponse resume(HttpServletRequest request, String id) {
    Document current = required(owner(request), id);
    String status = current.getString("status");
    if ("COMPLETED".equals(status)) return response(current);
    if ("DISCARDED".equals(status))
      throw new ConflictException("DRAFT_CLOSED", "This draft has already been discarded.");
    if (!"COMPLETING".equals(status))
      throw new ConflictException(
          "DRAFT_NOT_FINALIZING", "This draft has no unfinished indicator save to resume.");
    Object payload = current.get("completionPayload");
    Number revision = current.get("completionRevision", Number.class);
    if (!(payload instanceof String) && !(payload instanceof Map) || revision == null)
      throw new ConflictException(
          "DRAFT_RESUME_UNAVAILABLE",
          "This older save has no durable completion request. Retry its original save request"
              + " before editing.");
    if (payload instanceof String text && text.length() > 2 * IndicatorDraftConfiguration.MAX_BYTES)
      throw new ConflictException(
          "DRAFT_RESUME_UNAVAILABLE", "The stored completion request exceeds its supported bound.");
    final JsonNode exactPayload;
    try {
      exactPayload =
          payload instanceof String
              ? mapper.readTree((String) payload)
              : mapper.valueToTree(payload);
    } catch (com.fasterxml.jackson.core.JsonProcessingException error) {
      throw new ConflictException(
          "DRAFT_RESUME_UNAVAILABLE",
          "The stored completion request could not be read. Its draft is preserved for recovery.");
    }
    return complete(
        request, id, new IndicatorDraftRequests.Complete(revision.longValue(), exactPayload));
  }

  private IndicatorDraftResponse completeReceipt(
      String owner, String id, Document current, String hash) {
    Document receipt = terminal(current, "COMPLETED", current.getString("targetIndicatorId"));
    if (!store.replace(owner, current, receipt)) {
      Document latest = required(owner, id);
      if (!"COMPLETED".equals(latest.getString("status"))
          || !hash.equals(latest.getString("completionHash"))) throw conflict();
      return response(latest);
    }
    return response(receipt);
  }

  private Document terminal(Document current, String status, String savedId) {
    Document receipt = new Document(current);
    // Receipts cannot keep references that would pin plugins or retain private execution
    // configuration.
    for (String key :
        List.of(
            "configuration",
            "completionPayload",
            "session",
            "legacyRecovery",
            "route",
            "sourceSnapshot",
            "activeSourceKey",
            "targetIndicatorId",
            "lastMutationId",
            "lastMutationHash",
            "_pluginReferenceWrite")) receipt.remove(key);
    receipt.put("_indicatorDraftReceipt", true);
    receipt.put("status", status);
    receipt.put("revision", revision(current) + 1);
    receipt.put("updatedAt", new Date());
    receipt.put("recoverable", false);
    if (savedId != null) receipt.put("savedIndicatorId", savedId);
    return receipt;
  }

  private IndicatorDraftResponse response(Document doc) {
    return response(doc, true);
  }

  private IndicatorDraftResponse response(Document doc, boolean includeConfiguration) {
    String status = doc.getString("status");
    return new IndicatorDraftResponse(
        doc.get("_id").toString(),
        type(doc),
        doc.getString("name"),
        includeConfiguration && doc.containsKey("configuration") ? configuration(doc) : null,
        1,
        revision(doc),
        doc.getString("sourceIndicatorId"),
        doc.getString("sourceRevision"),
        instant(doc.get("createdAt")),
        instant(doc.get("updatedAt")),
        "COMPLETING".equals(status) ? "DRAFT" : status,
        doc.getString("savedIndicatorId"),
        Boolean.TRUE.equals(doc.getBoolean("recoverable")),
        "COMPLETING".equals(status));
  }

  private static boolean matchesCompletionRevision(Document draft, Long expected) {
    Number original = draft.get("completionRevision", Number.class);
    if (original == null || expected == null) return false;
    Number captured = draft.get("completionClaimRevision", Number.class);
    // Existing pending/terminal rows predate this field; the claim always advanced by one.
    long claim = captured == null ? original.longValue() + 1 : captured.longValue();
    return expected == original.longValue() || expected == claim;
  }

  private static Instant instant(Object value) {
    return value instanceof Date date ? date.toInstant() : null;
  }

  private static void requireActive(Document doc) {
    if ("COMPLETING".equals(doc.getString("status"))) throw finalizing();
    if (!"DRAFT".equals(doc.getString("status")))
      throw new ConflictException(
          "DRAFT_CLOSED", "This draft has already been saved or discarded.");
  }

  private static ConflictException finalizing() {
    return new ConflictException(
        "DRAFT_FINALIZING",
        "This draft is being saved. Retry the same save request before editing it.");
  }

  private static ConflictException conflict() {
    return new ConflictException(
        "DRAFT_REVISION_CONFLICT",
        "This draft changed in another tab or request. Reload its latest version before editing.");
  }
}
