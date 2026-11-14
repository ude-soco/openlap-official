package com.openlap.visualization_methods.compatibility;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.google.gson.Gson;
import com.openlap.dataset.OpenLAPColumnDataType;
import com.openlap.dataset.OpenLAPDataColumn;
import com.openlap.dataset.OpenLAPDataSet;
import com.openlap.infrastructure.exception.ValidationException;
import com.openlap.template.VisualizationCodeGenerator;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class LegacyC3StringsTest {
  @Test
  void literalEncodingPreservesOriginalTextAndCannotCloseTheScriptElement() {
    String original = "Learner's \"access\" \\ workshop\nnext\r\ttab\b\f\u0000</script><script>bad()</script>&=\u2028\u2029";
    String escaped = LegacyC3Strings.literal(original);
    assertThat(new Gson().fromJson("\"" + escaped + "\"", String.class)).isEqualTo(original);
    assertThat(escaped).doesNotContain("'", "<", ">", "\n", "\r", "\t", "\u2028", "\u2029");
    assertThat(escaped).contains("\\u0027", "\\\"", "\\\\", "\\n", "\\r", "\\t", "\\u2028", "\\u2029", "\\u003c/script\\u003e");
  }

  @Test
  void escapeSequencesEnteredByTheUserRemainLiteralTextAfterRendering() {
    String original = "literal \\n and \\u0027 and \\\\";
    assertThat(new Gson().fromJson("\"" + LegacyC3Strings.literal(original) + "\"", String.class)).isEqualTo(original);
  }

  @Test
  void preparingLegacyInputsUsesPrivateCopiesAndKeepsNumericPrecision() throws Exception {
    String label = "Learner's accesses \\ workshop\n</script>";
    OpenLAPDataSet source = data(label, 2.75);
    Map<String, Object> parameters = new LinkedHashMap<>();
    parameters.put("chartTitle", label);
    parameters.put("width", 750.5);
    parameters.put("showLegend", "true");
    var prepared = LegacyC3Strings.copyForLegacy(source, parameters);

    assertThat(prepared.data()).isNotSameAs(source);
    assertThat(prepared.parameters()).isNotSameAs(parameters);
    assertThat(source.getColumns().get("category").getData()).containsExactly(label);
    assertThat(source.getColumns().get("category").getConfigurationData().getTitle()).isEqualTo(label);
    assertThat(parameters.get("chartTitle")).isEqualTo(label);
    assertThat(parameters.get("width")).isEqualTo(750.5);
    assertThat(prepared.data().getColumns().get("value").getData()).containsExactly(2.75);
    assertThat(prepared.data().getColumns().get("category").getData()).containsExactly(LegacyC3Strings.literal(label));
    assertThat(prepared.parameters()).containsEntry("chartTitle", LegacyC3Strings.literal(label))
        .containsEntry("width", "750.5").containsEntry("showLegend", true);
  }

  @Test
  void otherProvidersKeepTheirExistingDatasetAndEscapingContracts() throws Exception {
    VisualizationCodeGenerator other = mock(VisualizationCodeGenerator.class);
    var source = data("Already escaped \\n or apostrophe ' stays owned by this provider", 1);
    Map<String, Object> parameters = Map.of("chartTitle", "Apex's existing behavior");
    var prepared = LegacyC3Strings.prepare(other, source, parameters);
    assertThat(prepared.data()).isSameAs(source);
    assertThat(prepared.parameters()).isSameAs(parameters);
    verifyNoInteractions(other);
  }

  @Test
  void unquotedNumericAndBooleanParametersCannotInjectJavaScript() throws Exception {
    var source = data("Material", 1);
    assertThatThrownBy(() -> LegacyC3Strings.copyForLegacy(source, Map.of("width", "750;bad()")))
        .isInstanceOf(ValidationException.class).hasMessageContaining("finite numbers");
    assertThatThrownBy(() -> LegacyC3Strings.copyForLegacy(source, Map.of("showLegend", "true;bad()")))
        .isInstanceOf(ValidationException.class).hasMessageContaining("true or false");
    assertThatThrownBy(() -> LegacyC3Strings.copyForLegacy(source, Map.of("height", -1)))
        .isInstanceOf(ValidationException.class).hasMessageContaining("dimensions");
  }

  @Test
  void mislabeledNumericOutputCannotBecomeExecutableCode() throws Exception {
    var source = data("Material", "1];bad()");
    assertThatThrownBy(() -> LegacyC3Strings.copyForLegacy(source, Map.of()))
        .isInstanceOf(ValidationException.class).hasMessageContaining("finite numbers");
    source.getColumns().get("value").getData().clear();
    source.getColumns().get("value").getData().add(Double.NaN);
    assertThatThrownBy(() -> LegacyC3Strings.copyForLegacy(source, Map.of()))
        .isInstanceOf(ValidationException.class).hasMessageContaining("finite numbers");
  }

  private static OpenLAPDataSet data(String text, Object numeric) throws Exception {
    var data = new OpenLAPDataSet();
    var categories = new OpenLAPDataColumn<String>("category", OpenLAPColumnDataType.Text, true, text, text);
    categories.setData(new ArrayList<>(List.of(text)));
    data.addOpenLAPDataColumn(categories);
    var values = new OpenLAPDataColumn<Object>("value", OpenLAPColumnDataType.Numeric, true, "Value", "");
    values.setData(new ArrayList<>(List.of(numeric)));
    data.addOpenLAPDataColumn(values);
    return data;
  }
}
