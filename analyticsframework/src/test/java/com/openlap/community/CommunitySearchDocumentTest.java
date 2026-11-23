package com.openlap.community;

import static com.openlap.community.CommunitySearchDocument.Field.*;
import static org.assertj.core.api.Assertions.*;

import java.util.*;
import org.junit.Test;

public class CommunitySearchDocumentTest {
  @Test public void givesTheIndicatorNameTheSameWeightAsEachBehaviorField() {
    assertThat(List.of(NAME.weight, ACTIVITY_TYPES.weight, ACTIONS.weight, METHOD_NAME.weight,
        METHOD_DESCRIPTION.weight, CHART.weight, PLATFORM.weight, SPECIFIC_ACTIVITIES.weight))
        .containsExactly(4, 4, 4, 3, 3, 2, 1, 1);
    var source = new CommunitySearchDocument("id", "BASIC", "", "Pie",
        Map.of(NAME, "Forum participation", CHART, "Pie", METHOD_NAME, "   "));
    CommunitySearchEncoder encoder = new CommunitySearchEncoder() {
      public float[] document(String text) {
        return switch (text) {
          case "Forum participation" -> new float[] {1, 0};
          case "Pie" -> new float[] {0, 1};
          default -> throw new AssertionError("Empty or unexpected passage " + text);
        };
      }
      public float[] query(String text) { throw new AssertionError("Unexpected query"); }
    };
    float[] vector = source.embed(encoder);
    assertThat(vector[0]).isCloseTo(0.8944272f, within(0.00001f));
    assertThat(vector[1]).isCloseTo(0.4472136f, within(0.00001f));
    var renamed = new CommunitySearchDocument("id", "BASIC", "", "Pie", Map.of(NAME, "Forum use", CHART, "Pie"));
    assertThat(source.fingerprint()).isNotEqualTo(renamed.fingerprint());
  }

  @Test public void extractsVocabularyWithoutThePrivateQueryValues() {
    var owner = CommunitySanitizerTest.creator();
    var query = CommunitySanitizer.object(CommunitySanitizer.parse("""
        {"activityTypes":["https://example.test/vocab/video","https://example.test/vocab/Alice"],
         "actionOnActivities":["watched","https://example.test/vocab#watched","saved?key=secret","old-login"],
         "lrsStores":[{"uniqueIdentifier":"old-login"}],
         "platform":"Private platform","activities":{"statement.object.definition.name.en-US":["Private course"]}}
        """));
    Set<String> types = new TreeSet<>(), actions = new TreeSet<>();
    CommunitySearchProjection.addPublicLabels(query, owner, types, actions);
    assertThat(types).containsExactly("video");
    assertThat(actions).containsExactly("watched");
  }
}
