package com.openlap.community;

import static com.mongodb.client.model.Filters.*;
import static com.mongodb.client.model.Projections.include;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.mongodb.DBRef;
import com.openlap.community.CommunitySearchDocument.Field;
import com.openlap.user.entities.User;
import com.openlap.user.entities.utility_entities.LrsConsumer;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeSet;
import org.bson.Document;
import org.bson.conversions.Bson;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

/** Builds passages from catalog text and public filter labels, including the Basic sources of a complex indicator. */
@Component
class CommunitySearchProjection {
  private final MongoTemplate mongo;

  CommunitySearchProjection(@Qualifier("primaryMongoTemplate") MongoTemplate mongo) {
    this.mongo = mongo;
  }

  Bson projection() {
    return include("communityId", "communityMetadata", "createdBy", "indicatorQuery",
        "analyticsTechniqueReference.analyticsTechnique", "indicators.indicator");
  }

  CommunitySearchDocument project(Document source) {
    Document meta = source.get("communityMetadata", Document.class);
    var fields = new EnumMap<Field, String>(Field.class);
    String title = meta.getString("name"), method = meta.getString("method"), chart = meta.getString("chart");
    fields.put(Field.NAME, title);
    fields.put(Field.METHOD_NAME, method);
    fields.put(Field.CHART, chart);

    List<Document> records = new ArrayList<>(List.of(source));
    List<Object> leafIds = source.getList("indicators", Document.class, List.of()).stream()
        .limit(10).map(link -> referenceId(link.get("indicator"))).filter(Objects::nonNull).distinct().toList();
    if (!leafIds.isEmpty()) {
      // Only use sources that are independently visible in the pool.
      var eligible = CommunityCatalogService.eligible("indicators").getCriteriaObject();
      mongo.getCollection("analytics-indicator").find(and(eligible, in("_id", leafIds), eq("indicatorType", "BASIC")))
          .projection(projection()).into(records);
    }

    Set<String> types = new TreeSet<>();
    Set<String> actions = new TreeSet<>();
    var ownerIds = records.stream().map(row -> referenceId(row.get("createdBy"))).filter(Objects::nonNull).distinct().toList();
    Map<Object, User> owners = new HashMap<>();
    if (!ownerIds.isEmpty()) {
      mongo.getCollection("openlap-users").find(in("_id", ownerIds))
          .projection(include("name", "email", "lrsConsumerList.lrsId", "lrsConsumerList.uniqueIdentifier"))
          .forEach(raw -> owners.put(raw.get("_id"), mongo.getConverter().read(User.class, raw)));
    }
    for (Document row : records) {
      User owner = owners.get(referenceId(row.get("createdBy")));
      if (owner == null) continue;
      String queryText = row.get("indicatorQuery") instanceof String value ? value : null;
      JsonObject query = CommunitySanitizer.object(CommunitySanitizer.parse(queryText));
      addPublicLabels(query, owner, types, actions);
    }
    fields.put(Field.ACTIVITY_TYPES, String.join(", ", types));
    fields.put(Field.ACTIONS, String.join(", ", actions));
    // The pool has no public platform or specific-activity vocabulary. Never substitute an LRS or a raw object name.
    if (method != null && !method.isBlank()) {
      Object methodId = records.stream()
          .map(row -> row.get("analyticsTechniqueReference", new Document()))
          .map(ref -> referenceId(ref.get("analyticsTechnique"))).filter(Objects::nonNull).findFirst().orElse(null);
      if (methodId != null) {
        Document technique = mongo.getCollection("analytics-technique").find(and(eq("_id", methodId), eq("name", method)))
            .projection(include("description")).first();
        if (technique != null) fields.put(Field.METHOD_DESCRIPTION,
            CommunitySanitizer.text(technique.getString("description"), owners.get(referenceId(source.get("createdBy"))), ""));
      }
    }
    return new CommunitySearchDocument(source.getString("communityId"), meta.getString("type"),
        Objects.toString(method, ""), Objects.toString(chart, ""), fields);
  }

  private static Object referenceId(Object reference) {
    if (reference instanceof DBRef dbRef) return dbRef.getId();
    return reference instanceof Document doc ? doc.get("$id") : null;
  }

  static void addPublicLabels(JsonObject query, User owner, Set<String> types, Set<String> actions) {
    // Previous LRS registrations can still be present in saved queries. Use them only for redaction.
    User redactor = new User();
    redactor.setId(owner.getId());
    redactor.setName(owner.getName());
    redactor.setEmail(owner.getEmail());
    var identities = new ArrayList<LrsConsumer>();
    if (owner.getLrsConsumerList() != null) identities.addAll(owner.getLrsConsumerList());
    if (query.has("lrsStores") && query.get("lrsStores").isJsonArray()) {
      for (JsonElement store : query.getAsJsonArray("lrsStores")) {
        identities.add(new LrsConsumer(null, CommunitySanitizer.string(store, "lrsId"),
            CommunitySanitizer.string(store, "uniqueIdentifier")));
      }
    }
    redactor.setLrsConsumerList(identities);
    collect(query.get("activityTypes"), redactor, types);
    collect(query.get("actionOnActivities"), redactor, actions);
  }

  private static void collect(JsonElement raw, User redactor, Set<String> labels) {
    if (raw == null || !raw.isJsonArray()) return;
    for (JsonElement item : raw.getAsJsonArray()) {
      if (labels.size() >= 30) break;
      if (!item.isJsonPrimitive() || !item.getAsJsonPrimitive().isString()) continue;
      String text = item.getAsString();
      if (text.startsWith("https://") || text.startsWith("http://")) {
        text = text.substring(Math.max(text.lastIndexOf('/'), text.lastIndexOf('#')) + 1);
      }
      // Require plain vocabulary labels. Reject URL parameters, encoded identifiers and arbitrary markup.
      if (!text.matches("[\\p{L}][\\p{L}\\p{N} _-]{0,99}")) continue;
      String clean = CommunitySanitizer.text(text, redactor, "");
      if (!clean.isEmpty()) labels.add(clean);
    }
  }
}
