package com.openlap.analytics_module.services;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.mongodb.client.MongoCollection;
import com.mongodb.client.model.UpdateOptions;
import com.mongodb.client.result.UpdateResult;
import com.openlap.analytics_module.entities.Indicator;
import com.openlap.analytics_module.entities.utility_entities.IndicatorType;
import com.openlap.analytics_module.exceptions.indicator.ComplexIndicatorException;
import org.bson.Document;
import org.junit.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.mapping.event.*;

public class ComplexIndicatorReferencesTest {
  private final MongoTemplate mongo = mock(MongoTemplate.class);
  @SuppressWarnings("unchecked") private final MongoCollection<Document> gates = mock(MongoCollection.class);
  private final ComplexIndicatorSourceGuard sources = mock(ComplexIndicatorSourceGuard.class);

  private ComplexIndicatorReferences coordinator(long matched) {
    when(mongo.getCollection("analytics-indicator-reference-gates")).thenReturn(gates);
    when(gates.updateOne(any(Document.class), any(Document.class))).thenReturn(UpdateResult.acknowledged(matched, matched, null));
    return new ComplexIndicatorReferences(mongo, sources);
  }

  @Test public void newIndicatorsReceiveTheirIdBeforeTheDocumentIsConverted() {
    ComplexIndicatorReferences coordinator = coordinator(1);
    Indicator indicator = new Indicator();
    coordinator.onBeforeConvert(new BeforeConvertEvent<>(indicator, "analytics-indicator"));
    assertThat(org.bson.types.ObjectId.isValid(indicator.getId())).isTrue();
    String id = indicator.getId();
    coordinator.onBeforeConvert(new BeforeConvertEvent<>(indicator, "analytics-indicator"));
    assertThat(indicator.getId()).isEqualTo(id);
  }

  @Test public void deletionCannotRaceAnUnacknowledgedSourceOrParentSave() {
    ComplexIndicatorReferences coordinator = coordinator(0);
    assertThatThrownBy(() -> coordinator.beginDelete("source"))
        .isInstanceOf(ComplexIndicatorException.class).hasMessageContaining("unfinished save");
    ArgumentCaptor<Document> filter = ArgumentCaptor.forClass(Document.class);
    verify(gates).updateOne(filter.capture(), any(Document.class));
    assertThat(filter.getValue()).containsEntry("deleting", new Document("$ne", true));
    assertThat(filter.getValue().getList("$or", Document.class)).contains(
        new Document("pins", new Document()), new Document("pins", new Document("$exists", false)));
  }

  @Test public void aDeletionFenceRejectsABasicRewriteBeforeItCanResurrectTheSource() {
    ComplexIndicatorReferences coordinator = coordinator(0);
    Indicator source = new Indicator(); source.setId("source"); source.setIndicatorType(IndicatorType.BASIC);
    Document document = new Document("_id", "source");
    assertThatThrownBy(() -> coordinator.onBeforeSave(new BeforeSaveEvent<>(source, document, "analytics-indicator")))
        .isInstanceOf(ComplexIndicatorException.class);
    assertThat(document).doesNotContainKey("_complexIndicatorWrite");
  }

  @Test public void onlyTheDeletionOwnerCanCancelItsFence() {
    ComplexIndicatorReferences coordinator = coordinator(1);
    String token = coordinator.beginDelete("source");
    coordinator.cancelDelete("source", token);
    verify(gates).updateOne(eq(new Document("_id", "source").append("deleteToken", token)),
        eq(new Document("$set", new Document("deleting", false)).append("$unset", new Document("deleteToken", ""))));
  }

  @Test public void eachSaveReservesItsOwnIdAndReleasesOnlyItsTokenAfterAcknowledgement() {
    ComplexIndicatorReferences coordinator = coordinator(1);
    Indicator source = new Indicator(); source.setId("source"); source.setIndicatorType(IndicatorType.BASIC);
    Document document = new Document("_id", "source");
    coordinator.onBeforeSave(new BeforeSaveEvent<>(source, document, "analytics-indicator"));
    Document marker = document.get("_complexIndicatorWrite", Document.class);
    assertThat(marker.getList("sourceIds", String.class)).containsExactly("source");
    @SuppressWarnings("unchecked") MongoCollection<Document> indicators = mock(MongoCollection.class);
    when(mongo.getCollection("analytics-indicator")).thenReturn(indicators);
    coordinator.onAfterSave(new AfterSaveEvent<>(source, document, "analytics-indicator"));
    verify(gates).updateOne(eq(new Document("_id", "source")),
        eq(new Document("$unset", new Document("pins." + marker.getString("token"), ""))));
    verify(indicators).updateOne(eq(new Document("_id", "source").append("_complexIndicatorWrite.token", marker.getString("token"))),
        eq(new Document("$unset", new Document("_complexIndicatorWrite", ""))));
  }
}
