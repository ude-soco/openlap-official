package com.openlap.analytics_module.services.impl;

import static org.assertj.core.api.Assertions.*;

import com.openlap.dataset.*;
import com.openlap.infrastructure.exception.ValidationException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.junit.Test;

public class AnalyticsInputPreparationTest {
  @Test public void explicitNumericMappingConvertsDecimalAndScientificValuesWithoutLosingMissingRows() {
    OpenLAPDataSet data = dataset("score", OpenLAPColumnDataType.Text, 2, "3.25", null, "1e2", " ");
    OpenLAPDataSet contract = dataset("values", OpenLAPColumnDataType.Numeric);
    OpenLAPPortConfig mapping = mapping(data, contract, "score", "values");

    var prepared = AnalyticsInputPreparation.prepare(data, contract, mapping);

    assertThat(prepared.data()).isNotSameAs(data);
    assertThat(prepared.data().getColumns().get("__openlap_input_values").getData())
        .containsExactly(2, 3.25, null, 100.0, null);
    assertThat(data.getColumns().get("score").getData()).containsExactly(2, "3.25", null, "1e2", " ");
    assertThat(mapping.getMapping().get(0).getOutputPort().getType()).isEqualTo(OpenLAPColumnDataType.Text);
    assertThat(contract.validateConfiguration(prepared.mapping()).isValid()).isTrue();
    assertThat(prepared.mapping().getMapping().get(0).getOutputPort().getType())
        .isEqualTo(OpenLAPColumnDataType.Numeric);
  }

  @Test public void oneSourceCanRemainACategoryAndAlsoFeedAnExplicitNumericInput() {
    OpenLAPDataSet data = dataset("score", OpenLAPColumnDataType.Text, "001", null, "2.5");
    OpenLAPDataSet contract = dataset("values", OpenLAPColumnDataType.Numeric);
    add(contract, "group", OpenLAPColumnDataType.Text);
    OpenLAPPortConfig mapping = mapping(data, contract, "score", "values");
    mapping.getMapping().add(pair(data, contract, "score", "group"));

    var prepared = AnalyticsInputPreparation.prepare(data, contract, mapping);

    assertThat(prepared.data().getColumns().get("score").getData()).containsExactly("001", null, "2.5");
    assertThat(prepared.data().getColumns().get("__openlap_input_values").getData()).containsExactly(1.0, null, 2.5);
  }

  @Test public void textMethodsKeepNativeLegacyValuesAndSourceIdentity() {
    OpenLAPDataSet data = dataset("labels", OpenLAPColumnDataType.Text, "001", 42, null, " ");
    OpenLAPDataSet contract = dataset("items", OpenLAPColumnDataType.Text);

    var prepared = AnalyticsInputPreparation.prepare(data, contract, mapping(data, contract, "labels", "items"));

    assertThat(prepared.data()).isSameAs(data);
    assertThat(prepared.data().getColumns().get("labels").getData()).containsExactly("001", 42, null, " ");
  }

  @Test public void explicitBooleanInputsPreserveFalseAndMissingValues() {
    OpenLAPDataSet data = dataset("completed", OpenLAPColumnDataType.Text, false, "TRUE", " false ", null, "");
    OpenLAPDataSet contract = dataset("status", OpenLAPColumnDataType.TrueFalse);

    var prepared = AnalyticsInputPreparation.prepare(data, contract, mapping(data, contract, "completed", "status"));

    assertThat(prepared.data().getColumns().get("__openlap_input_status").getData())
        .containsExactly(false, true, false, null, null);
  }

  @Test public void invalidNumericDataNeverBecomesZeroOrLeaksItsValue() {
    for (Object invalid : List.of("private-learner-value", "NaN", "Infinity", "1e1000", Double.NaN,
        Double.NEGATIVE_INFINITY, true)) {
      OpenLAPDataSet data = dataset("score", OpenLAPColumnDataType.Text, 1, invalid);
      OpenLAPDataSet contract = dataset("values", OpenLAPColumnDataType.Numeric);
      assertThatThrownBy(() -> AnalyticsInputPreparation.prepare(data, contract, mapping(data, contract, "score", "values")))
          .isInstanceOf(ValidationException.class)
          .hasMessageContaining("nonnumeric or nonfinite")
          .hasMessageNotContaining("private-learner-value");
    }
  }

  @Test public void booleanInputsDoNotTreatArbitraryStringsOrNumbersAsFalse() {
    for (Object invalid : List.of("private-learner-value", "yes", 1, 0)) {
      OpenLAPDataSet data = dataset("status", OpenLAPColumnDataType.Text, invalid);
      OpenLAPDataSet contract = dataset("completed", OpenLAPColumnDataType.TrueFalse);
      assertThatThrownBy(() -> AnalyticsInputPreparation.prepare(data, contract, mapping(data, contract, "status", "completed")))
          .isInstanceOf(ValidationException.class).hasMessageContaining("true/false");
    }
  }

  @Test public void rejectsMisalignedObservationsBeforeAnyMethodCanPairThem() {
    OpenLAPDataSet data = dataset("score", OpenLAPColumnDataType.Text, "1", "2");
    add(data, "learner", OpenLAPColumnDataType.Text, "one");
    OpenLAPDataSet contract = dataset("values", OpenLAPColumnDataType.Numeric);
    add(contract, "group", OpenLAPColumnDataType.Text);
    OpenLAPPortConfig mapping = mapping(data, contract, "score", "values");
    mapping.getMapping().add(pair(data, contract, "learner", "group"));

    assertThatThrownBy(() -> AnalyticsInputPreparation.prepare(data, contract, mapping))
        .isInstanceOf(ValidationException.class).hasMessageContaining("different numbers of observations");
  }

  @Test public void validatesTheInstalledContractRatherThanTrustingClientPortTypes() {
    OpenLAPDataSet data = dataset("score", OpenLAPColumnDataType.Text, "1");
    OpenLAPDataSet contract = dataset("values", OpenLAPColumnDataType.Numeric);
    OpenLAPPortConfig missing = new OpenLAPPortConfig();
    assertThatThrownBy(() -> AnalyticsInputPreparation.normalizeMapping(contract, missing))
        .isInstanceOf(ValidationException.class).hasMessageContaining("required");
    OpenLAPPortConfig duplicated = mapping(data, contract, "score", "values");
    duplicated.getMapping().add(duplicated.getMapping().get(0));
    assertThatThrownBy(() -> AnalyticsInputPreparation.normalizeMapping(contract, duplicated))
        .isInstanceOf(ValidationException.class).hasMessageContaining("duplicates");
    OpenLAPPortConfig forged = new OpenLAPPortConfig(new ArrayList<>(List.of(new OpenLAPPortMapping(
        data.getColumns().get("score").getConfigurationData(),
        new OpenLAPColumnConfigData("values", OpenLAPColumnDataType.Text, true, "", "")))));
    assertThatThrownBy(() -> AnalyticsInputPreparation.normalizeMapping(contract, forged))
        .isInstanceOf(ValidationException.class).hasMessageContaining("inputs changed");
  }

  private static OpenLAPDataSet dataset(String id, OpenLAPColumnDataType type, Object... values) {
    OpenLAPDataSet data = new OpenLAPDataSet();
    add(data, id, type, values);
    return data;
  }

  private static void add(OpenLAPDataSet data, String id, OpenLAPColumnDataType type, Object... values) {
    OpenLAPDataColumn<Object> column = new OpenLAPDataColumn<>(id, type, true, id, "");
    column.setData(new ArrayList<>(Arrays.asList(values)));
    data.getColumns().put(id, column);
  }

  private static OpenLAPPortConfig mapping(OpenLAPDataSet data, OpenLAPDataSet contract, String source, String target) {
    return new OpenLAPPortConfig(new ArrayList<>(List.of(pair(data, contract, source, target))));
  }

  private static OpenLAPPortMapping pair(OpenLAPDataSet data, OpenLAPDataSet contract, String source, String target) {
    return new OpenLAPPortMapping(data.getColumns().get(source).getConfigurationData(),
        contract.getColumns().get(target).getConfigurationData());
  }
}
