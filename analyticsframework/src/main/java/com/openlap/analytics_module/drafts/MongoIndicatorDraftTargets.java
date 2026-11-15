package com.openlap.analytics_module.drafts;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mongodb.DBRef;
import com.mongodb.MongoWriteException;
import com.openlap.analytics_module.entities.Indicator;
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
  static final String COMPLETION_ID = "_draftCompletionId", COMPLETION_HASH = "_draftCompletionHash";
  private static final List<String> DEFINITION = List.of("name", "indicatorType", "createdBy",
      "visualizationTechniqueReference", "createdOn", "configurationRequest", "indicatorQuery",
      "analyticsTechniqueReference", "columnToMerge", "indicators");
  private final MongoTemplate mongo;
  private final ComplexIndicatorReferences sources;
  private final PluginReferenceFence plugins;
  private final ObjectMapper mapper;
  private final IndicatorDraftConfiguration configurations;
  public MongoIndicatorDraftTargets(@Qualifier("primaryMongoTemplate") MongoTemplate mongo,
      ComplexIndicatorReferences sources, ObjectMapper mapper, IndicatorDraftConfiguration configurations) {
    this.mongo=mongo; this.sources=sources; this.mapper=mapper; this.configurations=configurations;
    plugins=new PluginReferenceFence(mongo);
  }
  private static Document identity(String id) { return new Document("_id", ObjectId.isValid(id)
      ? new Document("$in", List.of(id,new ObjectId(id))) : id); }
  @Override public Document snapshot(String owner, String id) {
    Document found=mongo.getCollection(COLLECTION).find(identity(id)).first();
    if (found==null || !(found.get("createdBy") instanceof DBRef creator) || !owner.equals(creator.getId().toString()))
      throw new NotFoundException("INDICATOR_NOT_FOUND", "This saved indicator is not available to edit.");
    Document snapshot=new Document("_id",found.get("_id"));
    DEFINITION.forEach(key -> { if(found.containsKey(key)) snapshot.put(key,found.get(key)); });
    return snapshot;
  }
  @Override public String fingerprint(Document snapshot) {
    return configurations.hash(mapper.valueToTree(normalize(snapshot)));
  }
  private static Object normalize(Object value) {
    if(value instanceof DBRef ref) return Map.of("collection",ref.getCollectionName(),"id",ref.getId().toString());
    if(value instanceof ObjectId id) return id.toHexString();
    if(value instanceof Date date) return date.toInstant().toString();
    if(value instanceof Map<?,?> map) {
      Map<String,Object> result=new TreeMap<>(); map.forEach((key,item)->result.put(key.toString(),normalize(item))); return result;
    }
    if(value instanceof Collection<?> list) return list.stream().map(MongoIndicatorDraftTargets::normalize).toList();
    return value;
  }
  private void release(Indicator indicator, Document document) {
    plugins.afterSave(document);
    sources.onAfterSave(new AfterSaveEvent<>(indicator,document,COLLECTION));
  }
  @Override public boolean recover(String owner, Document draft, String hash) {
    String target=draft.getString("targetIndicatorId");
    Document existing=mongo.getCollection(COLLECTION).find(identity(target)).first();
    if(existing!=null && draft.get("_id").toString().equals(existing.getString(COMPLETION_ID))
        && hash.equals(existing.getString(COMPLETION_HASH))) {
      if(!(existing.get("createdBy") instanceof DBRef creator) || !owner.equals(creator.getId().toString())) throw conflict();
      Indicator identity=new Indicator(); identity.setId(target); release(identity,existing); return true;
    }
    return false;
  }
  @Override public void publish(String owner, Document draft, Indicator indicator, String hash) {
    String target=draft.getString("targetIndicatorId"), draftId=draft.get("_id").toString();
    if(recover(owner,draft,hash)) return;
    Document existing=mongo.getCollection(COLLECTION).find(identity(target)).first();
    Document source=draft.get("sourceSnapshot",Document.class);
    if(source==null && existing!=null) throw conflict();
    indicator.setId(target);
    Document output=new Document(); mongo.getConverter().write(indicator,output);
    if(source!=null) output.put("_id",source.get("_id"));
    output.put(COMPLETION_ID,draftId); output.put(COMPLETION_HASH,hash);
    sources.onBeforeSave(new BeforeSaveEvent<>(indicator,output,COLLECTION));
    try { plugins.beforeSave(output,COLLECTION); }
    catch(RuntimeException error) { release(indicator,output); throw error; }
    boolean saved;
    if(source==null) {
      try { mongo.getCollection(COLLECTION).insertOne(output); saved=true; }
      catch(MongoWriteException error) {
        if(error.getError().getCode()!=11000) throw error;
        saved=false;
      }
    } else {
      Document filter=new Document("_id",source.get("_id"));
      DEFINITION.forEach(key -> filter.put(key,source.containsKey(key) ? source.get(key) : new Document("$exists",false)));
      // Only definition fields change; execution counters and unrelated metadata stay intact.
      Document set=new Document(COMPLETION_ID,draftId).append(COMPLETION_HASH,hash);
      Document unset=new Document();
      DEFINITION.forEach(key -> { if(output.containsKey(key)) set.put(key,output.get(key)); else unset.put(key,""); });
      for(String marker:List.of("_complexIndicatorWrite","_pluginReferenceWrite")) if(output.containsKey(marker)) set.put(marker,output.get(marker));
      Document update=new Document("$set",set); if(!unset.isEmpty()) update.put("$unset",unset);
      saved=mongo.getCollection(COLLECTION).updateOne(filter,update).getMatchedCount()==1;
    }
    // Uncertain driver exceptions deliberately keep reservations. A matching retry releases them.
    release(indicator,output);
    if(!saved) {
      Document recovered=mongo.getCollection(COLLECTION).find(identity(target)).first();
      if(recovered!=null && draftId.equals(recovered.getString(COMPLETION_ID)) && hash.equals(recovered.getString(COMPLETION_HASH))) {
        release(indicator,recovered); return;
      }
      throw conflict();
    }
  }
  private static ConflictException conflict() {
    return new ConflictException("SOURCE_INDICATOR_CHANGED",
        "The saved indicator changed or was deleted while this draft was open. Your draft is preserved; reopen the current indicator before replacing it.");
  }
}
