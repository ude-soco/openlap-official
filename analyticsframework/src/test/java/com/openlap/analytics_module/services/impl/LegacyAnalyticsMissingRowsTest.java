package com.openlap.analytics_module.services.impl;

import static org.assertj.core.api.Assertions.*;

import com.openlap.AnalyticsMethods.Prototypes.NullSensitiveMethodFixture;
import com.openlap.dataset.*;
import com.openlap.template.AnalyticsMethod;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import org.junit.Test;

public class LegacyAnalyticsMissingRowsTest {
  @Test public void legacyTextMethodsExcludeIncompleteWholeRowsAndPreserveBlankLabels() {
    var method = new NullSensitiveMethodFixture(OpenLAPColumnDataType.Text);
    var data = data(new Object[] {"A", null, "C", "", "E"}, new Object[] {"one", "two", null, "", "five"});

    var output = AnalyticsInputPreparation.execute(method, data, mapping(data, method), Map.of());

    assertThat(output.getColumns().get("value").getData()).containsExactly("A", "", "E");
    assertThat(output.getColumns().get("group").getData()).containsExactly("one", "", "five");
    assertThat(data.getColumns().get("source").getData()).containsExactly("A", null, "C", "", "E");
    assertThat(data.getColumns().get("label").getData()).containsExactly("one", "two", null, "", "five");
  }

  @Test public void legacyFilteringPreservesConvertedColumnAliasesAndOriginalPairOrder() {
    var method = new NullSensitiveMethodFixture(OpenLAPColumnDataType.Numeric);
    var data = data(new Object[] {"2.5", null, "4.5", "5.5"}, new Object[] {"one", "two", null, "four"});

    var output = AnalyticsInputPreparation.execute(method, data, mapping(data, method), Map.of());

    assertThat(output.getColumns().get("value").getData()).containsExactly(2.5, 5.5);
    assertThat(output.getColumns().get("group").getData()).containsExactly("one", "four");
    assertThat(data.getColumns().get("source").getData()).containsExactly("2.5", null, "4.5", "5.5");
  }

  @Test public void modernMethodsStillReceiveEveryNullPlaceholderForTheirExclusionDiagnostics() {
    var method = new ModernMethod();
    var data = data(new Object[] {"A", null, "C"}, new Object[] {null, "two", "three"});

    var output = AnalyticsInputPreparation.execute(method, data, mapping(data, method), Map.of());

    assertThat(output.getColumns().get("value").getData()).containsExactly("A", null, "C");
    assertThat(output.getColumns().get("group").getData()).containsExactly(null, "two", "three");
  }

  private static OpenLAPDataSet data(Object[] values, Object[] labels) {
    OpenLAPDataSet data = new OpenLAPDataSet();
    for (var entry : Map.of("source", values, "label", labels).entrySet()) {
      var column = new OpenLAPDataColumn<Object>(entry.getKey(), OpenLAPColumnDataType.Text, true, entry.getKey(), "");
      column.setData(new ArrayList<>(Arrays.asList(entry.getValue())));
      data.getColumns().put(entry.getKey(), column);
    }
    return data;
  }

  private static OpenLAPPortConfig mapping(OpenLAPDataSet data, AnalyticsMethod method) {
    return new OpenLAPPortConfig(new ArrayList<>(List.of(
        new OpenLAPPortMapping(data.getColumns().get("source").getConfigurationData(),
            method.getInput().getColumns().get("value").getConfigurationData()),
        new OpenLAPPortMapping(data.getColumns().get("label").getConfigurationData(),
            method.getInput().getColumns().get("group").getConfigurationData()))));
  }

  private static class ModernMethod extends NullSensitiveMethodFixture {
    ModernMethod() { super(OpenLAPColumnDataType.Text); }
    @Override @SuppressWarnings({"rawtypes", "unchecked"})
    protected void implementationExecution() {
      for (String id : List.of("value", "group")) {
        getOutput().getColumns().get(id).setData(new ArrayList(getInput().getColumns().get(id).getData()));
      }
    }
  }
}
