package com.openlap.plugins.management;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.mapping.event.AbstractMongoEventListener;
import org.springframework.data.mongodb.core.mapping.event.AfterSaveEvent;
import org.springframework.data.mongodb.core.mapping.event.BeforeSaveEvent;
import org.springframework.stereotype.Component;

/** Covers repository save/saveAll and MongoTemplate insert/save on the primary reference collections. */
@Component
@ConditionalOnProperty(prefix = "openlap.plugins", name = "mode", havingValue = "s3")
public class PluginReferenceWriteListener extends AbstractMongoEventListener<Object> {
  private final PluginReferenceFence fence;
  public PluginReferenceWriteListener(MongoTemplate mongo) { fence = new PluginReferenceFence(mongo); }
  @Override public void onBeforeSave(BeforeSaveEvent<Object> event) { fence.beforeSave(event.getDocument(), event.getCollectionName()); }
  @Override public void onAfterSave(AfterSaveEvent<Object> event) {
    if (PluginReferences.COLLECTIONS.contains(event.getCollectionName())) fence.afterSave(event.getDocument());
  }
}
