package com.openlap.plugins;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import com.mongodb.DBRef;
import com.openlap.infrastructure.exception.ValidationException;
import com.openlap.plugins.management.PluginReferences;
import org.bson.Document;
import org.junit.Test;

public class PluginReferencesTest {
  private final PluginReferences references = new PluginReferences();

  @Test public void collectsDbRefsAndNestedSerializedDraftSelections() {
    Document row = new Document("analyticsTechniqueReference", new Document("analyticsTechnique", new DBRef("analytics-technique", "method-1")))
        .append("session", "{\"analysis\":{\"selectedMethod\":{\"id\":\"method-2\"}},\"visualization\":{\"selectedType\":{\"id\":\"chart-1\"}}}");
    assertThat(references.collect(row)).contains("method-1", "method-2", "chart-1");
  }

  @Test public void ignoresInternalReservationsAndUnrelatedCreatorIds() {
    assertThat(references.collect(new Document("_id", "source").append("createdBy", new DBRef("users", "creator"))
        .append("_pluginReferenceWrite", new Document("token", "private-marker")))).isEmpty();
  }

  @Test public void unreadableJsonCannotBeTreatedAsAnUnusedPlugin() {
    assertThatThrownBy(() -> references.collect(new Document("session", "{private-incomplete-data")))
        .isInstanceOf(ValidationException.class).hasFieldOrPropertyWithValue("code", "PLUGIN_REFERENCE_DATA_INVALID")
        .hasMessage("A stored configuration contains unreadable or oversized JSON. Repair or discard that configuration before removing plugins.");
  }

  @Test public void incompleteDraftSlicesRemainSupported() {
    assertThat(references.collect(new Document("session", "{\"analysis\":null}").append("visRef", "").append("dataset", "null"))).doesNotContain("null");
  }

  @Test public void readonlyCommunityRecipeDoesNotPinUnusedPluginsButOwnedSourceDraftsDo() {
    Document draft = new Document("ownerId", "viewer").append("communityAdapted", true)
        .append("adaptation", new Document("reference", new Document("methodId", "old-method")))
        .append("configuration", new Document("sourceDrafts", new Document("source-1",
            new Document("methodId", "selected-method").append("params",
                new Document("adaptation", new Document("reference", "parameter-plugin"))))));
    assertThat(references.collect(draft)).contains("selected-method", "parameter-plugin").doesNotContain("old-method");
    assertThat(draft.get("adaptation", Document.class).get("reference")).isNotNull();
    draft.remove("communityAdapted");
    assertThat(references.collect(draft)).contains("old-method");
  }
}
