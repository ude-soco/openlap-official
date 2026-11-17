package com.openlap.community.adaptation;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.mongodb.client.FindIterable;
import com.mongodb.client.MongoCollection;
import com.openlap.infrastructure.exception.ValidationException;
import java.util.Date;
import java.util.Map;
import java.util.UUID;
import org.bson.Document;
import org.bson.conversions.Bson;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.mongodb.core.MongoTemplate;

class AdaptationProofStoreTest {
  final MongoTemplate mongo = mock(MongoTemplate.class);
  @SuppressWarnings("unchecked") final MongoCollection<Document> rows = mock(MongoCollection.class);
  final AdaptationProofStore proofs = new AdaptationProofStore(mongo);

  @Test void receiptsContainOnlyPrivateCapabilityMetadataAndExpire() {
    when(mongo.getCollection(AdaptationProofStore.COLLECTION)).thenReturn(rows);
    var result = new AdaptationExecution.Result(null, java.util.List.of(), null, "private generated chart", "bindings", "plugins", Map.of());
    String id = proofs.create("viewer", "draft-one", 4, "configuration", result);
    var capture = ArgumentCaptor.forClass(Document.class);
    verify(rows).insertOne(capture.capture());
    assertThat(capture.getValue()).containsEntry("_id", id).containsEntry("owner", "viewer").containsEntry("draftId", "draft-one")
        .containsEntry("revision", 4L).containsEntry("configurationHash", "configuration");
    assertThat(capture.getValue()).doesNotContainKeys("data", "previewCode", "configuration", "reference");
    assertThat(capture.getValue().getDate("expiresAt")).isAfter(new Date());
  }

  @Test void lookupIncludesOwnerDraftRevisionConfigurationAndRejectsExpiredProof() {
    when(mongo.getCollection(AdaptationProofStore.COLLECTION)).thenReturn(rows);
    @SuppressWarnings("unchecked") FindIterable<Document> found = mock(FindIterable.class);
    when(rows.find(any(Bson.class))).thenReturn(found);
    when(found.first()).thenReturn(new Document("expiresAt", new Date(0)));
    String id = UUID.randomUUID().toString();
    assertThatThrownBy(() -> proofs.require(id, "viewer", "draft-one", 4, "configuration")).isInstanceOf(ValidationException.class);
    var capture = ArgumentCaptor.forClass(Document.class);
    verify(rows).find(capture.capture());
    assertThat(capture.getValue()).containsEntry("owner", "viewer").containsEntry("draftId", "draft-one")
        .containsEntry("revision", 4L).containsEntry("configurationHash", "configuration");
  }

  @Test void previewControllerDisablesStorageOfPersonalPreviewResponses() {
    var lifecycle = mock(IndicatorAdaptationLifecycle.class);
    var response = new AdaptationPreviewController(lifecycle).preview(null, "draft", new AdaptationPreviewController.Request(1L, "analysis"));
    assertThat(response.getHeaders().getCacheControl()).contains("no-store", "private");
    assertThat(response.getHeaders().getFirst("Pragma")).isEqualTo("no-cache");
    assertThat(response.getBody()).isInstanceOf(com.openlap.response.ApiSuccess.class);
  }
}
