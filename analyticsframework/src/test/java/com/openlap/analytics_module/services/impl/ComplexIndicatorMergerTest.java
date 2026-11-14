package com.openlap.analytics_module.services.impl;

import static org.assertj.core.api.Assertions.*;

import com.openlap.analytics_module.dto.response.indicator.ComplexIndicatorMergeResult;
import com.openlap.dataset.OpenLAPColumnConfigData;
import com.openlap.dataset.OpenLAPColumnDataType;
import com.openlap.dataset.OpenLAPDataColumn;
import com.openlap.dataset.OpenLAPDataSet;
import com.openlap.dataset.OpenLAPPortConfig;
import com.openlap.dataset.OpenLAPPortMapping;
import com.openlap.infrastructure.exception.ValidationException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;

class ComplexIndicatorMergerTest {
  private final ComplexIndicatorMerger merger = new ComplexIndicatorMerger();

  @Test
  void pdfUnionIncludesAllEightMaterialsAndExplainsAbsentValues() throws Exception {
    var access = source("access", "Access", "materials", List.of("Material 1", "Material 6", "Item 1", "Material 9", "Item 2"),
        "count", List.of(860, 600, 553, 400, 320));
    var students = source("students", "Students", "materials", List.of("Material 1", "Material 6", "Item 1", "Material 10", "Item 2", "Item 3", "Material 5"),
        "count", List.of(182, 175, 175, 160, 110, 90, 50));

    ComplexIndicatorMergeResult result = merger.merge(List.of(access, students), false);

    assertThat(result.getRowCount()).isEqualTo(8);
    assertThat(data(result, "key")).containsExactly("Material 1", "Material 6", "Item 1", "Material 9", "Item 2", "Material 10", "Item 3", "Material 5");
    assertThat(data(result, "source_access__count")).containsExactly(860, 600, 553, 400, 320, 0, 0, 0);
    assertThat(data(result, "source_students__count")).containsExactly(182, 175, 175, 0, 110, 160, 90, 50);
    assertThat(result.getFilledCells()).containsExactly(
        new ComplexIndicatorMergeResult.FilledCell(5, "source_access__count", "access"),
        new ComplexIndicatorMergeResult.FilledCell(6, "source_access__count", "access"),
        new ComplexIndicatorMergeResult.FilledCell(7, "source_access__count", "access"),
        new ComplexIndicatorMergeResult.FilledCell(3, "source_students__count", "students"));
    assertThat(data(access.data(), "count")).containsExactly(860, 600, 553, 400, 320);
    assertThat(result.getColumnOrder()).containsExactly("key", "source_access__count", "source_students__count");
  }

  @Test
  void pdfIntersectionKeepsSixCommonMaterialsAndTheirOriginalValues() throws Exception {
    var access = source("access", "Access", "materials", List.of("Material 1", "Material 6", "Item 1", "Material 9", "Item 2", "Material 4"),
        "count", List.of(860, 600, 553, 400, 320, 126));
    var annotations = source("annotations", "Annotations", "different_key", List.of("Material 1", "Material 6", "Item 1", "Material 9", "Item 2", "Material 4", "Item 6"),
        "total", List.of(43, 40, 35, 32, 22, 15, 6));

    var result = merger.merge(List.of(access, annotations), true);

    assertThat(result.getRowCount()).isEqualTo(6);
    assertThat(data(result, "source_access__count")).containsExactly(860, 600, 553, 400, 320, 126);
    assertThat(data(result, "source_annotations__total")).containsExactly(43, 40, 35, 32, 22, 15);
    assertThat(result.getSources().get(1).excludedRows()).isEqualTo(1);
    assertThat(result.getFilledCells()).isEmpty();
    assertThat(result.getChartData()).isNull();
  }

  @Test
  void preservesDecimalsMultipleMeasuresAndExplicitMeasureOrdering() throws Exception {
    var first = source("a", "First", "items", List.of("a", "b"), "count", List.of(1.25, 0.0));
    add(first.data(), "average", OpenLAPColumnDataType.Numeric, List.of(2.75, 3.5));
    first = new ComplexIndicatorMerger.Source(first.indicatorId(), first.label(), first.key(), List.of("average", "count"), first.data());
    var second = source("b", "Second", "other", List.of("a", "c"), "total", List.of(4.125, 5.5));

    var result = merger.merge(List.of(first, second), false);

    assertThat(result.getColumnOrder()).containsExactly("key", "source_a__average", "source_a__count", "source_b__total");
    assertThat(data(result, "source_a__average")).containsExactly(2.75, 3.5, 0);
    assertThat(data(result, "source_a__count")).containsExactly(1.25, 0.0, 0);
    assertThat(data(result, "source_b__total")).containsExactly(4.125, 0, 5.5);
    assertThat(result.getFilledCells()).doesNotContain(new ComplexIndicatorMergeResult.FilledCell(1, "source_a__count", "a"));
  }

  @Test
  void groupedChartDatasetContainsAlignedLongRowsForEveryMeasure() throws Exception {
    var result = merger.merge(List.of(
        source("a", "First", "items", List.of("x", "y"), "count", List.of(1.25, 2.5)),
        source("b", "Second", "other", List.of("y"), "count", List.of(9.75))), false);

    assertThat(data(result.getChartData(), "combined_key")).containsExactly("x", "y", "x", "y");
    assertThat(data(result.getChartData(), "combined_series")).containsExactly("First · count", "First · count", "Second · count", "Second · count");
    assertThat(data(result.getChartData(), "combined_value")).containsExactly(1.25, 2.5, 0, 9.75);
    assertThat(result.getChartData().getColumnsConfigurationData()).allSatisfy(column ->
        assertThat(result.getChartData().getColumns().get(column.getId()).getData()).hasSize(4));
  }

  @Test
  void numericKeysMatchWithoutTruncatingTheirValues() throws Exception {
    var first = numericKeySource("a", List.of(1, 2.5), List.of(3.5, 4.5));
    var second = numericKeySource("b", List.of(1.0, 3.25), List.of(5.5, 6.5));
    var result = merger.merge(List.of(first, second), false);
    assertThat(data(result, "key")).containsExactly(1, 2.5, 3.25);
    assertThat(result.getRowCount()).isEqualTo(3);
  }

  @Test
  void emptyIntersectionIsAnExplicitEmptyResultAndCannotReachAnalysis() throws Exception {
    var result = merger.merge(List.of(
        source("a", "A", "items", List.of("a"), "count", List.of(1)),
        source("b", "B", "items", List.of("b"), "count", List.of(2))), true);
    assertThat(result.getRowCount()).isZero();
    assertThat(data(result, "key")).isEmpty();
    assertThatThrownBy(() -> ComplexIndicatorDataService.requireNonempty(result))
        .isInstanceOf(ValidationException.class).hasMessageContaining("No matching rows");
  }

  @Test
  void rejectsDuplicateKeysInsteadOfChoosingAnArbitraryValue() throws Exception {
    rejects(source("a", "A", "items", List.of("a", "a"), "count", List.of(1, 2)), "duplicate");
  }

  @Test
  void rejectsMissingOrBlankMatchingKeys() throws Exception {
    rejects(source("a", "A", "items", Arrays.asList("a", null), "count", List.of(1, 2)), "nonempty");
    rejects(source("a", "A", "items", List.of("a", "  "), "count", List.of(1, 2)), "nonempty");
  }

  @Test
  void rejectsNullMeasurementsRatherThanCallingThemZero() throws Exception {
    rejects(source("a", "A", "items", List.of("a", "b"), "count", Arrays.asList(1, null)), "Unknown values");
  }

  @Test
  void rejectsNonFiniteNumbers() throws Exception {
    rejects(source("a", "A", "items", List.of("a"), "count", List.of(Double.NaN)), "invalid number");
    rejects(source("a", "A", "items", List.of("a"), "count", List.of(Double.POSITIVE_INFINITY)), "invalid number");
  }

  @Test
  void rejectsUnequalColumnLengthsAndUnsupportedSelections() throws Exception {
    var first = source("a", "A", "items", List.of("a"), "count", List.of(1));
    first.data().getColumns().get("count").getData().clear();
    rejects(first, "unequal lengths");
    var valid = source("a", "A", "items", List.of("a"), "count", List.of(1));
    rejects(new ComplexIndicatorMerger.Source("a", "A", valid.key(), List.of("missing"), valid.data()), "existing numeric");
  }

  @Test
  void rejectsMixedKeyTypesAndRepeatedSources() throws Exception {
    var first = source("a", "A", "items", List.of("a"), "count", List.of(1));
    var second = numericKeySource("b", List.of(1), List.of(2));
    assertThatThrownBy(() -> merger.merge(List.of(first, second), false))
        .isInstanceOf(ValidationException.class).hasMessageContaining("same data type");
    assertThatThrownBy(() -> merger.merge(List.of(first, first), false))
        .isInstanceOf(ValidationException.class).hasMessageContaining("distinct");
  }

  @Test
  void chartMappingCannotMixLongAndWideDatasetsOrForgeColumnTypes() throws Exception {
    var result = merger.merge(List.of(
        source("a", "A", "items", List.of("a"), "count", List.of(1)),
        source("b", "B", "items", List.of("a"), "count", List.of(2))), false);
    var output = result.getChartData().getColumns().get("combined_value").getConfigurationData();
    var input = new OpenLAPColumnConfigData("y", OpenLAPColumnDataType.Numeric, true, "Y", "");
    var mapping = new OpenLAPPortConfig(new ArrayList<>(List.of(new OpenLAPPortMapping(output, input))));
    assertThat(ComplexIndicatorDataService.visualizationData(result, mapping)).isSameAs(result.getChartData());
    mapping.getMapping().add(new OpenLAPPortMapping(result.getColumns().get("key").getConfigurationData(),
        new OpenLAPColumnConfigData("x", OpenLAPColumnDataType.Text, true, "X", "")));
    assertThatThrownBy(() -> ComplexIndicatorDataService.visualizationData(result, mapping))
        .isInstanceOf(ValidationException.class).hasMessageContaining("missing");
  }

  @Test
  void selectionBoundsAreEnforcedBeforeMerging() {
    assertThatThrownBy(() -> merger.merge(List.of(), false)).isInstanceOf(ValidationException.class);
    assertThatThrownBy(() -> merger.merge(null, false)).isInstanceOf(ValidationException.class);
  }

  @Test
  void oversizedSourceAndCombinedResultsAreRejected() throws Exception {
    var keys = java.util.stream.IntStream.range(0, 10001).mapToObj(i -> "material-" + i).toList();
    var values = java.util.Collections.nCopies(keys.size(), 1);
    rejects(source("a", "A", "items", keys, "count", values), "too many rows");

    var allowedKeys = keys.subList(0, 10000);
    var allowedValues = values.subList(0, 10000);
    var first = source("a", "A", "items", allowedKeys, "count", allowedValues);
    var second = source("b", "B", "items", allowedKeys, "count", allowedValues);
    for (int index = 0; index < 5; index++) {
      add(first.data(), "measure_" + index, OpenLAPColumnDataType.Numeric, allowedValues);
      add(second.data(), "measure_" + index, OpenLAPColumnDataType.Numeric, allowedValues);
    }
    assertThatThrownBy(() -> merger.merge(List.of(first, second), false))
        .isInstanceOf(ValidationException.class).hasMessageContaining("too large");
  }

  private void rejects(ComplexIndicatorMerger.Source first, String message) throws Exception {
    var second = source("b", "B", "items", List.of("a"), "count", List.of(1));
    assertThatThrownBy(() -> merger.merge(List.of(first, second), false))
        .isInstanceOf(ValidationException.class).hasMessageContaining(message);
  }

  private static ComplexIndicatorMerger.Source numericKeySource(String id, List<?> keys, List<?> values) throws Exception {
    var data = new OpenLAPDataSet();
    add(data, "id", OpenLAPColumnDataType.Numeric, keys);
    add(data, "value", OpenLAPColumnDataType.Numeric, values);
    return new ComplexIndicatorMerger.Source(id, id, data.getColumns().get("id").getConfigurationData(), null, data);
  }

  private static ComplexIndicatorMerger.Source source(String id, String label, String key, List<?> keys, String measure, List<?> values) throws Exception {
    var data = new OpenLAPDataSet();
    add(data, key, OpenLAPColumnDataType.Text, keys);
    add(data, measure, OpenLAPColumnDataType.Numeric, values);
    return new ComplexIndicatorMerger.Source(id, label, data.getColumns().get(key).getConfigurationData(), null, data);
  }

  private static void add(OpenLAPDataSet data, String id, OpenLAPColumnDataType type, List<?> values) throws Exception {
    var column = new OpenLAPDataColumn<Object>(id, type, true, id, "");
    column.setData(new ArrayList<>(values));
    data.addOpenLAPDataColumn(column);
  }

  @SuppressWarnings("unchecked")
  private static List<Object> data(OpenLAPDataSet data, String id) {
    return data.getColumns().get(id).getData();
  }
}
