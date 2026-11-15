package com.openlap.analytics_module.services;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.openlap.analytics_module.services.impl.IndicatorBasicServiceImpl;
import com.openlap.analytics_statements.dtos.request.LrsStoresStatementRequest;
import com.openlap.analytics_statements.exception.LrsNotFoundException;
import com.openlap.user.entities.User;
import com.openlap.user.entities.utility_entities.LrsConsumer;
import com.openlap.user.services.TokenService;
import java.util.*;
import org.bson.types.ObjectId;
import org.junit.Test;
import org.springframework.mock.web.MockHttpServletRequest;

public class IndicatorRequestOwnershipTest {
  @Test public void oneOwnedPairCannotAuthorizeAnotherStoresOrAnotherLearnersData() {
    var request = new MockHttpServletRequest();
    var tokens = mock(TokenService.class);
    var owner = new User();
    owner.setLrsConsumerList(List.of(new LrsConsumer(new ObjectId(), "first", "me-first"),
        new LrsConsumer(new ObjectId(), "second", "me-second")));
    when(tokens.getUserFromToken(request)).thenReturn(owner);
    var service = new IndicatorBasicServiceImpl(null, null, null, tokens, null);
    assertThatCode(() -> service.validateUserRequest(request, List.of(
        new LrsStoresStatementRequest("first", "me-first"),
        new LrsStoresStatementRequest("second", "me-second")))).doesNotThrowAnyException();
    for (var invalid : List.of(new LrsStoresStatementRequest("foreign", "me-first"),
        new LrsStoresStatementRequest("second", "me-first"),
        new LrsStoresStatementRequest("first", "someone-else"))) {
      assertThatThrownBy(() -> service.validateUserRequest(request, List.of(
          new LrsStoresStatementRequest("first", "me-first"), invalid)))
          .isInstanceOf(LrsNotFoundException.class);
    }
    assertThatThrownBy(() -> service.validateUserRequest(request, Collections.emptyList()))
        .isInstanceOf(LrsNotFoundException.class);
    assertThatThrownBy(() -> service.validateUserRequest(request, Arrays.asList((LrsStoresStatementRequest) null)))
        .isInstanceOf(LrsNotFoundException.class);
  }
}
