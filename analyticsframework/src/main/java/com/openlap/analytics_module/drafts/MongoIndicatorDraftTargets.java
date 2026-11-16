package com.openlap.analytics_module.drafts;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mongodb.DBRef;
import com.mongodb.MongoWriteException;
import com.openlap.analytics_module.entities.Indicator;
import com.openlap.community.CommunityMetadata;
import com.openlap.analytics_module.services.ComplexIndicatorReferences;
import com.openlap.infrastructure.exception.ConflictException;
import com.openlap.infrastructure.exception.NotFoundException;
import com.openlap.plugins.management.PluginReferenceFence;
import java.util.*;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.mapping.event.*;
import org.springframework.stereotype.Component;

/** Publication is insert-only for new indicators and compare-and-set for edits. */
@Component
public class MongoIndicatorDraftTargets implements IndicatorDraftTargets {
  static final String COLLECTION = "analytics-indicator";
  static final String COMPLETION_ID = "_draftCompletionId",
      COMPLETION_HASH = "_draftCompletionHash";
  private static final List<String> DEFINITION =
      List.of(
          "name",
          "indicatorType",
          "createdBy",
          "visualizationTechniqueReference",
          "createdOn",
          "configurationRequest",
          "indicatorQuery",
          "analyticsTechniqueReference",
          "columnToMerge",
          "indicators");
  private final MongoTemplate mongo;
  private final ComplexIndicatorReferences sources;
  private final PluginReferenceFence plugins;
  private final ObjectMapper mapper;
  private final IndicatorDraftConfiguration configurations;

  public MongoIndicatorDraftTargets(
      @Qualifier("primaryMongoTemplate") MongoTemplate mongo,
      ComplexIndicatorReferences sources,
      ObjectMapper mapper,
      IndicatorDraftConfiguration configurations) {
    this.mongo = mongo;
    this.sources = sources;
    this.mapper = mapper;
    this.configurations = configurations;
    plugins = new PluginReferenceFence(mongo);
  }

  private static Document identity(String id) {
    return new Document(
        "_id", ObjectId.isValid(id) ? new Document("$in", List.of(id, new ObjectId(id))) : id);
  }

  @Override
  public Document snapshot(String owner, String id) {
    Document found = mongo.getCollection(COLLECTION).find(identity(id)).first();
    requireOwner(found, owner);
    requireSourceFinalized(found);
    Document snapshot = new Document("_id", found.get("_id"));
    DEFINITION.forEach(
        key -> {
          if (found.containsKey(key)) snapshot.put(key, found.get(key));
        });
    for (String key : List.of("communitySourceId", "communitySourceVersion", "communityAdapted", "communityDependency"))
      if (found.containsKey(key)) snapshot.put(key, found.get(key));
    return snapshot;
  }

  private static void requireOwner(Document source, String owner) {
    if (source == null
        || source.get("communityCopyPending") != null
        || !(source.get("createdBy") instanceof DBRef creator)
        || !owner.equals(creator.getId().toString()))
      throw new NotFoundException(
          "INDICATOR_NOT_FOUND", "This saved indicator is not available to edit.");
  }

  private void requireSourceFinalized(Document source) {
    String completion = source.getString(COMPLETION_ID);
    int suffix = completion == null ? -1 : completion.indexOf("/source/");
    if (suffix < 1) return;
    if (mongo.getCollection(IndicatorDraftStore.COLLECTION)
        .find(new Document("_id", completion.substring(0, suffix)).append("status", "COMPLETING"))
        .projection(new Document("_id", 1)).first() != null)
      throw new ConflictException("DRAFT_FINALIZING",
          "This source is part of an unfinished indicator save. Resume that save before editing or deleting it.");
  }

  private static Document definitionFilter(Document source) {
    Document filter = new Document("_id", source.get("_id"));
    DEFINITION.forEach(
        key ->
            filter.put(
                key, source.containsKey(key) ? source.get(key) : new Document("$exists", false)));
    return filter;
  }

  private boolean updateDefinition(Document source, Document output) {
    Document set = new Document();
    Document unset = new Document();
    DEFINITION.forEach(
        key -> {
          if (output.containsKey(key)) set.put(key, output.get(key));
          else unset.put(key, "");
        });
    // Legacy edits keep receipt markers and counters. Only a new draft publication replaces its
    // markers.
    for (String marker :
        List.of(COMPLETION_ID, COMPLETION_HASH, "_complexIndicatorWrite", "_pluginReferenceWrite"))
      if (output.containsKey(marker)) set.put(marker, output.get(marker));
    if (output.containsKey("communityMetadata")) set.put("communityMetadata", output.get("communityMetadata"));
    Document update = new Document("$set", set);
    if (!unset.isEmpty()) update.put("$unset", unset);
    return mongo
            .getCollection(COLLECTION)
            .updateOne(definitionFilter(source), update)
            .getMatchedCount()
        == 1;
  }

  @Override
  public void updateSaved(String owner, Document expected, Indicator indicator) {
    requireOwner(expected, owner);
    Document current = mongo.getCollection(COLLECTION).find(identity(expected.get("_id").toString())).first();
    requireOwner(current, owner);
    requireSourceFinalized(current);
    indicator.setId(expected.get("_id").toString());
    Document output = new Document();
    mongo.getConverter().write(indicator, output);
    CommunityMetadata.populate(indicator, output);
    output.put("_id", expected.get("_id"));
    sources.onBeforeSave(new BeforeSaveEvent<>(indicator, output, COLLECTION));
    try {
      plugins.beforeSave(output, COLLECTION);
    } catch (RuntimeException error) {
      release(indicator, output);
      throw error;
    }
    boolean saved = updateDefinition(expected, output);
    // An uncertain driver exception retains pins; an acknowledged nonmatch can release them.
    release(indicator, output);
    if (!saved) throw conflict();
  }

  @Override
  public void deleteSaved(String owner, Document expected) {
    requireOwner(expected, owner);
    Document current = mongo.getCollection(COLLECTION).find(identity(expected.get("_id").toString())).first();
    requireOwner(current, owner);
    requireSourceFinalized(current);
    // The caller holds the existing deletion gate, preventing a source writer from racing this CAS.
    // Publication creates its claim before its target. Once a target is visible, this protects the
    // gap between that write and its durable completion receipt (including a crashed publisher).
    if (mongo
            .getCollection(IndicatorDraftStore.COLLECTION)
            .find(
                new Document("targetIndicatorId", expected.get("_id").toString())
                    .append("status", "COMPLETING"))
            .projection(new Document("_id", 1))
            .first()
        != null)
      throw new ConflictException(
          "DRAFT_FINALIZING",
          "This indicator has an unfinished save. Resume that save before deleting it.");
    if (mongo.getCollection(COLLECTION).deleteOne(definitionFilter(expected)).getDeletedCount()
        != 1) throw conflict();
  }

  @Override
  public String fingerprint(Document snapshot) {
    return configurations.hash(mapper.valueToTree(normalize(snapshot)));
  }

  private static Object normalize(Object value) {
    if (value instanceof DBRef ref)
      return Map.of("collection", ref.getCollectionName(), "id", ref.getId().toString());
    if (value instanceof ObjectId id) return id.toHexString();
    if (value instanceof Date date) return date.toInstant().toString();
    if (value instanceof Map<?, ?> map) {
      Map<String, Object> result = new TreeMap<>();
      map.forEach((key, item) -> result.put(key.toString(), normalize(item)));
      return result;
    }
    if (value instanceof Collection<?> list)
      return list.stream().map(MongoIndicatorDraftTargets::normalize).toList();
    return value;
  }

  private void release(Indicator indicator, Document document) {
    plugins.afterSave(document);
    sources.onAfterSave(new AfterSaveEvent<>(indicator, document, COLLECTION));
  }

  @Override
  public boolean recover(String owner, Document draft, String hash) {
    String target = draft.getString("targetIndicatorId");
    Document existing = mongo.getCollection(COLLECTION).find(identity(target)).first();
    if (existing != null
        && draft.get("_id").toString().equals(existing.getString(COMPLETION_ID))
        && hash.equals(existing.getString(COMPLETION_HASH))) {
      if (!(existing.get("createdBy") instanceof DBRef creator)
          || !owner.equals(creator.getId().toString())) throw conflict();
      Indicator identity = new Indicator();
      identity.setId(target);
      release(identity, existing);
      return true;
    }
    return false;
  }

  @Override
  public void publish(String owner, Document draft, Indicator indicator, String hash) {
    String target = draft.getString("targetIndicatorId"), draftId = draft.get("_id").toString();
    if (recover(owner, draft, hash)) return;
    Document existing = mongo.getCollection(COLLECTION).find(identity(target)).first();
    Document source = draft.get("sourceSnapshot", Document.class);
    if (source == null && existing != null) throw conflict();
    indicator.setId(target);
    Document output = new Document();
    mongo.getConverter().write(indicator, output);
    CommunityMetadata.populate(indicator, output);
    if (source != null) output.put("_id", source.get("_id"));
    output.put(COMPLETION_ID, draftId);
    output.put(COMPLETION_HASH, hash);
    sources.onBeforeSave(new BeforeSaveEvent<>(indicator, output, COLLECTION));
    try {
      plugins.beforeSave(output, COLLECTION);
    } catch (RuntimeException error) {
      release(indicator, output);
      throw error;
    }
    boolean saved;
    if (source == null) {
      output.put("communityId", UUID.randomUUID().toString());
      try {
        mongo.getCollection(COLLECTION).insertOne(output);
        saved = true;
      } catch (MongoWriteException error) {
        if (error.getError().getCode() != 11000) throw error;
        saved = false;
      }
    } else {
      saved = updateDefinition(source, output);
    }
    // Uncertain driver exceptions deliberately keep reservations. A matching retry releases them.
    release(indicator, output);
    if (!saved) {
      Document recovered = mongo.getCollection(COLLECTION).find(identity(target)).first();
      if (recovered != null
          && draftId.equals(recovered.getString(COMPLETION_ID))
          && hash.equals(recovered.getString(COMPLETION_HASH))) {
        release(indicator, recovered);
        return;
      }
      throw conflict();
    }
  }

  private static ConflictException conflict() {
    return new ConflictException(
        "SOURCE_INDICATOR_CHANGED",
        "The saved indicator changed or was deleted while this draft was open. Your draft is"
            + " preserved; reopen the current indicator before replacing it.");
  }
}
