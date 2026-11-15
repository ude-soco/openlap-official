package com.openlap.analytics_module.services;

import com.mongodb.MongoWriteException;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.model.UpdateOptions;
import com.openlap.analytics_module.entities.Indicator;
import com.openlap.analytics_module.entities.utility_entities.IndicatorType;
import com.openlap.analytics_module.exceptions.indicator.ComplexIndicatorException;
import java.util.*;
import org.bson.Document;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.mapping.event.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/**
 * Coordinates reference writes with source deletion across backend replicas.
 * Pins survive uncertain writes; they never expire merely because time passed.
 * Kept separately from source documents so replacing a Basic cannot erase pins.
 */
@Component
public class ComplexIndicatorReferences extends AbstractMongoEventListener<Indicator> {
  static final String COLLECTION = "analytics-indicator";
  static final String MARKER = "_complexIndicatorWrite";
  private final MongoTemplate mongo;
  private final ComplexIndicatorSourceGuard sources;

  public ComplexIndicatorReferences(@Qualifier("primaryMongoTemplate") MongoTemplate mongo,
      ComplexIndicatorSourceGuard sources) {
    this.mongo = mongo;
    this.sources = sources;
  }

  private MongoCollection<Document> gates() {
    return mongo.getCollection("analytics-indicator-reference-gates");
  }

  private void ensure(String id) {
    try {
      gates().updateOne(new Document("_id", id),
          new Document("$setOnInsert", new Document("pins", new Document()).append("deleting", false)),
          new UpdateOptions().upsert(true));
    } catch (MongoWriteException race) {
      if (race.getError().getCode() != 11000) throw race;
    }
  }

  @Override
  public void onBeforeConvert(BeforeConvertEvent<Indicator> event) {
    if (COLLECTION.equals(event.getCollectionName()) && event.getSource().getId() == null) {
      event.getSource().setId(new org.bson.types.ObjectId().toHexString());
    }
  }

  @Override
  public void onBeforeSave(BeforeSaveEvent<Indicator> event) {
    if (!COLLECTION.equals(event.getCollectionName()) || event.getDocument() == null) return;
    Indicator indicator = event.getSource();
    if (event.getDocument().get("_id") == null) {
      throw ComplexIndicatorException.invalid("The indicator could not be assigned an identity. Retry the save.");
    }
    Set<String> ids = new LinkedHashSet<>();
    ids.add(event.getDocument().get("_id").toString());
    if (indicator.getIndicatorType() == IndicatorType.COMPOSITE
        || indicator.getIndicatorType() == IndicatorType.MULTI_LEVEL) {
      sources.validateSaved(indicator);
      indicator.getIndicators().forEach(source -> ids.add(source.getIndicator().getId()));
    }
    String token = UUID.randomUUID().toString();
    List<String> acquired = new ArrayList<>();
    try {
      for (String id : ids) {
        ensure(id);
        if (gates().updateOne(new Document("_id", id).append("deleting", new Document("$ne", true)),
            new Document("$set", new Document("pins." + token,
                new Document("indicatorId", indicator.getId()).append("createdAt", new Date()))))
            .getMatchedCount() != 1) {
          throw busy();
        }
        acquired.add(id);
      }
      event.getDocument().put(MARKER,
          new Document("token", token).append("sourceIds", new ArrayList<>(ids)));
    } catch (RuntimeException error) {
      release(token, acquired);
      throw error;
    }
  }

  @Override
  public void onAfterSave(AfterSaveEvent<Indicator> event) {
    if (!COLLECTION.equals(event.getCollectionName()) || event.getDocument() == null) return;
    Document marker = event.getDocument().get(MARKER, Document.class);
    if (marker == null) return;
    String token = marker.getString("token");
    release(token, marker.getList("sourceIds", String.class));
    mongo.getCollection(COLLECTION).updateOne(
        new Document("_id", event.getDocument().get("_id")).append(MARKER + ".token", token),
        new Document("$unset", new Document(MARKER, "")));
  }

  private void release(String token, Collection<String> ids) {
    for (String id : ids) {
      gates().updateOne(new Document("_id", id),
          new Document("$unset", new Document("pins." + token, "")));
    }
  }

  public String beginDelete(String id) {
    ensure(id);
    String token = UUID.randomUUID().toString();
    Document empty = new Document("$or", List.of(
        new Document("pins", new Document("$exists", false)), new Document("pins", new Document())));
    empty.put("_id", id);
    empty.put("deleting", new Document("$ne", true));
    if (gates().updateOne(empty, new Document("$set", new Document("deleting", true)
        .append("deleteToken", token)))
        .getMatchedCount() != 1) throw busy();
    return token;
  }

  public void cancelDelete(String id, String token) {
    gates().updateOne(new Document("_id", id).append("deleteToken", token),
        new Document("$set", new Document("deleting", false))
            .append("$unset", new Document("deleteToken", "")));
  }

  private ComplexIndicatorException busy() {
    return new ComplexIndicatorException(HttpStatus.CONFLICT, "INDICATOR_REFERENCE_BUSY",
        "This indicator has an unfinished save or deletion. Retry after it completes. "
            + "An uncertain write needs a maintainer to verify it before removing its reference pin.");
  }
}
