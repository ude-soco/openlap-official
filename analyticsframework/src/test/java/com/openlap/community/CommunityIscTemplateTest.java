package com.openlap.community;

import static org.assertj.core.api.Assertions.*;
import com.openlap.isc_module.entities.IndicatorSpecificationCard;
import java.util.*;
import org.junit.Test;

public class CommunityIscTemplateTest {
  static IndicatorSpecificationCard source() {
    IndicatorSpecificationCard source = new IndicatorSpecificationCard();
    source.setCreatedBy(CommunitySanitizerTest.creator()); source.setId("original-private-isc-id");
    source.setIndicatorName("Weekly material use");
    source.setRequirements("""
      {"goalType":{"id":"original-goal-id","verb":"monitor","category":"Monitoring"},
      "goal":"Monitor weekly material access","question":"Which materials are used?","indicatorName":"Weekly material use",
      "selectedPath":"Dataset","data":[{"id":"original-category-id","value":"Material","type":{"type":"string","value":"Categorical"}},
      {"id":"original-number-id","value":"Accesses","type":{"type":"number","value":"Numerical"}}]}
      """);
    source.setDataset("""
      {"file":{"name":"alice-private-file.csv"},"rows":[{"id":"original-row-id","original-category-id":"Alice","original-number-id":991357}],
      "columns":[{"field":"original-category-id","headerName":"Material"}]}
      """);
    source.setVisRef("""
      {"chart":{"type":"Bar chart","code":"bar"},"filter":{"type":"Distribution"},"data":{
      "axisOptions":{"selectedXAxis":"original-category-id","selectedYAxis":"original-number-id"},
      "options":{"title":{"text":"Alice"},"annotations":[{"text":"alice@private.example"}]},
      "series":[{"name":"Alice","data":[991357]}]}}
      """);
    return source;
  }
  @Test public void specificationKeepsPurposeAndTypesWithNewColumnIdsAndIllustrativeData() {
    CommunityIscTemplate result = CommunityIscTemplate.from(source());
    assertThat(result.name()).isEqualTo("Weekly material use");
    assertThat(result.requirements()).containsEntry("goal", "Monitor weekly material access").containsEntry("selectedPath", "Dataset");
    var rows = (List<?>) result.dataset().get("rows"); assertThat(rows).hasSize(4);
    String published = CommunitySanitizer.json(List.of(result.requirements(), result.dataset(), result.visRef()));
    assertThat(published).contains("Material", "Accesses", "Example 1", "col1", "col2");
    assertThat(published).doesNotContain("original-", "Alice", "alice@", "private", "991357", ".csv");
    var axis = (Map<?, ?>) ((Map<?, ?>) result.visRef().get("data")).get("axisOptions");
    assertThat(axis.get("selectedXAxis")).isEqualTo("col1"); assertThat(axis.get("selectedYAxis")).isEqualTo("col2");
  }
  @Test public void sourceRowsAndChartOptionsNeverAffectCommunityContentOrVersion() {
    var source = source(); var first = CommunityIscTemplate.from(source);
    source.setDataset("{\"rows\":[{\"secret\":\"another person\"}]}");
    source.setVisRef(source.getVisRef().replace("991357", "775533"));
    var second = CommunityIscTemplate.from(source);
    assertThat(second.version()).isEqualTo(first.version());
    source.setRequirements(source.getRequirements().replace("Which materials are used?", "How does material usage change?"));
    assertThat(CommunityIscTemplate.from(source).version()).isNotEqualTo(first.version());
  }
  @Test public void personalRequirementsAreReplacedAndMalformedLegacySlicesAreSafe() {
    var source = source(); source.setIndicatorName("Alice private report");
    source.setRequirements("{\"goal\":\"Track Alice\",\"question\":\"private-learner-id\",\"data\":[]}");
    source.setVisRef("not JSON");
    var safe = CommunityIscTemplate.from(source);
    assertThat(safe.name()).isEqualTo("Learning indicator specification");
    assertThat(CommunitySanitizer.json(safe.requirements())).doesNotContain("Alice", "private-learner");
    assertThat((List<?>) safe.dataset().get("columns")).hasSize(2);
    assertThat(((Map<?, ?>) safe.visRef().get("chart")).get("type")).isEqualTo("Bar chart");
  }
}
