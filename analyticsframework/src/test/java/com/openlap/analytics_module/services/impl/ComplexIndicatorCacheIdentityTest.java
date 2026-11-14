package com.openlap.analytics_module.services.impl;

import static org.assertj.core.api.Assertions.*;
import com.openlap.analytics_module.entities.Indicator;
import com.openlap.analytics_module.entities.utility_entities.*;
import com.openlap.analytics_technique.entities.AnalyticsTechnique;
import com.openlap.user.entities.User;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.Test;

public class ComplexIndicatorCacheIdentityTest {
  private Indicator basic(String id) {
    Indicator result = new Indicator(); result.setId(id); result.setIndicatorType(IndicatorType.BASIC);
    User owner = new User(); owner.setId("owner"); result.setCreatedBy(owner);
    result.setCreatedOn(LocalDateTime.of(2026, 11, 14, 12, 0));
    AnalyticsTechnique method = new AnalyticsTechnique(); method.setId("method");
    result.setAnalyticsTechniqueReference(new AnalyticsTechniqueReference("[]", "{}", method));
    result.setIndicatorQuery("{\"outputs\":[\"materials\"]}");
    return result;
  }

  @Test public void sourceDefinitionChangesInvalidateTheParentEvenWithAnIdenticalTimestamp() {
    Indicator one = basic("one"), two = basic("two"), parent = basic("parent");
    parent.setIndicatorType(IndicatorType.COMPOSITE);
    parent.setIndicators(List.of(new IndicatorsToMerge(one, "key"), new IndicatorsToMerge(two, "key")));
    String before = IndicatorServiceImpl.indicatorFingerprint(parent, true);
    two.setIndicatorQuery("{\"outputs\":[\"annotations\"]}");
    assertThat(IndicatorServiceImpl.indicatorFingerprint(parent, true)).isNotEqualTo(before);
    String withQuery = IndicatorServiceImpl.indicatorFingerprint(parent, true);
    two.getAnalyticsTechniqueReference().setAdditionalParams("[{\"id\":\"limit\",\"value\":5}]");
    assertThat(IndicatorServiceImpl.indicatorFingerprint(parent, true)).isNotEqualTo(withQuery);
  }

  @Test public void rawAndUriEncodedChartsNeverShareACachedRepresentation() {
    Indicator one = basic("one");
    assertThat(IndicatorServiceImpl.indicatorFingerprint(one, true))
        .isNotEqualTo(IndicatorServiceImpl.indicatorFingerprint(one, false));
  }
}
