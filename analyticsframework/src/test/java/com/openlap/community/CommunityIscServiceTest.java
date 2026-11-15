package com.openlap.community;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import com.openlap.infrastructure.exception.ConflictException;
import com.openlap.isc_module.entities.IndicatorSpecificationCard;
import com.openlap.isc_module.entities.IscStatus;
import com.openlap.user.entities.User;
import com.openlap.user.services.TokenService;
import org.junit.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.IndexOperations;
import org.springframework.mock.web.MockHttpServletRequest;

public class CommunityIscServiceTest {
  @Test public void copyIsIndependentOwnerScopedAndContainsOnlyIllustrativeData() {
    var catalog = mock(CommunityCatalogService.class); var mongo = mock(MongoTemplate.class); var tokens = mock(TokenService.class);
    var request = new MockHttpServletRequest(); User viewer = new User(); viewer.setId("abcdef0123456789abcdef01"); viewer.setName("Bob Learner");
    when(tokens.getUserFromToken(request)).thenReturn(viewer);
    when(mongo.indexOps(IndicatorSpecificationCard.class)).thenReturn(mock(IndexOperations.class));
    var source = CommunityIscTemplateTest.source(); when(catalog.resolveIsc(CommunityCatalogTest.POOL)).thenReturn(source);
    var service = new CommunityIscService(catalog, mongo, tokens);
    var receipt = service.copy(request, CommunityCatalogTest.POOL, CommunityIscTemplate.from(source).version());
    ArgumentCaptor<IndicatorSpecificationCard> copied = ArgumentCaptor.forClass(IndicatorSpecificationCard.class);
    verify(mongo).insert(copied.capture());
    var result = copied.getValue();
    assertThat(result.getCreatedBy()).isSameAs(viewer); assertThat(result.getStatus()).isEqualTo(IscStatus.SAVED);
    assertThat(result.getCommunitySourceId()).isEqualTo(CommunityCatalogTest.POOL);
    assertThat(result.getCommunitySourceVersion()).isNotBlank();
    assertThat(result.getId()).isNotEqualTo(source.getId()); assertThat(result.getSourceId()).isNull();
    assertThat(result.getDataset()).contains("Example 1").doesNotContain("Alice", "991357", "private", "original-");
    assertThat(receipt).containsEntry("id", result.getId()).containsEntry("alreadySaved", false);
  }
  @Test public void obsoleteVersionCannotSaveAndAlreadySavedReturnsOriginalCopyWithoutWriting() {
    var catalog = mock(CommunityCatalogService.class); var mongo = mock(MongoTemplate.class); var tokens = mock(TokenService.class);
    var request = new MockHttpServletRequest(); var viewer = CommunitySanitizerTest.creator(); when(tokens.getUserFromToken(request)).thenReturn(viewer);
    when(catalog.resolveIsc(CommunityCatalogTest.POOL)).thenReturn(CommunityIscTemplateTest.source());
    var service = new CommunityIscService(catalog, mongo, tokens);
    assertThatThrownBy(() -> service.copy(request, CommunityCatalogTest.POOL, "old version")).isInstanceOf(ConflictException.class);
    verifyNoInteractions(mongo);
    when(catalog.copiedId("isc", CommunityCatalogTest.POOL, viewer.getId())).thenReturn("existing-copy-id");
    assertThat(service.copy(request, CommunityCatalogTest.POOL, null)).containsEntry("id", "existing-copy-id").containsEntry("alreadySaved", true);
    verifyNoInteractions(mongo);
  }
  @Test public void simultaneousCopyRaceReturnsTheOnePersistedCopy() {
    var catalog = mock(CommunityCatalogService.class); var mongo = mock(MongoTemplate.class); var tokens = mock(TokenService.class);
    var request = new MockHttpServletRequest(); var viewer = CommunitySanitizerTest.creator(); when(tokens.getUserFromToken(request)).thenReturn(viewer);
    when(mongo.indexOps(IndicatorSpecificationCard.class)).thenReturn(mock(IndexOperations.class));
    var source = CommunityIscTemplateTest.source(); when(catalog.resolveIsc(CommunityCatalogTest.POOL)).thenReturn(source);
    when(catalog.copiedId("isc", CommunityCatalogTest.POOL, viewer.getId())).thenReturn(null, "racing-copy-id");
    when(mongo.insert(any(IndicatorSpecificationCard.class))).thenThrow(new DuplicateKeyException("race"));
    var service = new CommunityIscService(catalog, mongo, tokens);
    assertThat(service.copy(request, CommunityCatalogTest.POOL, CommunityIscTemplate.from(source).version()))
        .containsEntry("id", "racing-copy-id").containsEntry("alreadySaved", true);
  }
}
