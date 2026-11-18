package com.openlap.analytics.methods;

import com.openlap.dataset.OpenLAPColumnDataType;
import com.openlap.dataset.OpenLAPDataColumn;
import com.openlap.dataset.OpenLAPDataColumnFactory;
import com.openlap.dataset.OpenLAPDataSet;
import com.openlap.dynamicparam.OpenLAPDynamicParam;
import com.openlap.dynamicparam.OpenLAPDynamicParamDataType;
import com.openlap.dynamicparam.OpenLAPDynamicParamFactory;
import com.openlap.dynamicparam.OpenLAPDynamicParamType;
import com.openlap.dynamicparam.OpenLAPDynamicParams;
import com.openlap.template.AnalyticsMethod;
import java.io.InputStream;
import java.util.List;

/** Shared contract utilities. No input list is modified by these methods. */
abstract class AnalyticalMethod extends AnalyticsMethod {
  static final int MAX_ROWS = 100_000;

  AnalyticalMethod(String type) {
    setType(type);
    setInput(new OpenLAPDataSet());
    setOutput(new OpenLAPDataSet());
    setParams(new OpenLAPDynamicParams());
  }

  final void input(String id, OpenLAPColumnDataType type, boolean required, String title, String description) {
    column(getInput(), id, type, required, title, description);
  }

  final void output(String id, OpenLAPColumnDataType type, String title, String description) {
    column(getOutput(), id, type, true, title, description);
  }

  private static void column(OpenLAPDataSet dataset, String id, OpenLAPColumnDataType type,
                             boolean required, String title, String description) {
    try {
      dataset.addOpenLAPDataColumn(OpenLAPDataColumnFactory.createOpenLAPDataColumnOfType(id, type, required, title, description));
    } catch (Exception exception) {
      throw new IllegalStateException("Could not define analytics contract", exception);
    }
  }

  final void integerParameter(String id, String title, String description, int defaultValue) {
    parameter(id, OpenLAPDynamicParamType.Textbox, OpenLAPDynamicParamDataType.INTEGER, title, description, defaultValue, "");
  }

  final void choiceParameter(String id, String title, String description, String defaultValue, String values) {
    parameter(id, OpenLAPDynamicParamType.Choice, OpenLAPDynamicParamDataType.STRING, title, description, defaultValue, values);
  }

  private void parameter(String id, OpenLAPDynamicParamType type, OpenLAPDynamicParamDataType dataType,
                         String title, String description, Object defaultValue, String values) {
    try {
      getParams().addOpenLAPDynamicParam(OpenLAPDynamicParamFactory.createOpenLAPDataColumnOfType(
          id, type, dataType, title, description, defaultValue, values, true));
    } catch (Exception exception) {
      throw new IllegalStateException("Could not define analytics parameter", exception);
    }
  }

  final Object parameter(String id) {
    OpenLAPDynamicParam<?> param = getParams().getParams().get(id);
    return param.getValue() == null ? param.getDefaultValue() : param.getValue();
  }

  final int integer(String id, int minimum, int maximum) {
    Object value = parameter(id);
    if (!(value instanceof Number number) || !Double.isFinite(number.doubleValue())
        || number.doubleValue() != Math.rint(number.doubleValue())
        || number.doubleValue() < minimum || number.doubleValue() > maximum) {
      throw invalid("Choose " + id.replace('_', ' ') + " between " + minimum + " and " + maximum + ".");
    }
    return number.intValue();
  }

  final List<?> data(String id) {
    OpenLAPDataColumn<?> column = getInput().getColumns().get(id);
    return column == null || column.getData() == null ? List.of() : column.getData();
  }

  final void sameRows(List<?> first, List<?> second) {
    if (first.size() != second.size()) throw invalid("Mapped columns must contain the same observations in the same order.");
    if (first.size() > MAX_ROWS) throw invalid("This method supports at most " + MAX_ROWS + " observations per preview.");
  }

  static Double numeric(Object value) {
    if (value == null) return null;
    if (!(value instanceof Number number) || !Double.isFinite(number.doubleValue())) {
      throw invalid("Choose a numeric measurement containing finite numbers. Missing values may be empty.");
    }
    return number.doubleValue();
  }

  static String group(Object value) {
    if (value == null) return null;
    if (!(value instanceof String text)) throw invalid("Choose a text column for the group or observation label.");
    return text.isBlank() ? null : text;
  }

  @SuppressWarnings({"unchecked", "rawtypes"})
  final void append(String id, Object value) {
    if (value instanceof Number number && !Double.isFinite(number.doubleValue())) {
      throw invalid("The numerical range is too large for a reliable result. Rescale your measurements and try again.");
    }
    ((OpenLAPDataColumn) getOutput().getColumns().get(id)).getData().add(value);
  }

  final void resetOutput() {
    for (OpenLAPDataColumn<?> column : getOutput().getColumns().values()) column.getData().clear();
  }

  static IllegalArgumentException invalid(String message) { return new IllegalArgumentException(message); }

  @Override public final Boolean hasPMML() { return false; }
  @Override public final InputStream getPMMLInputStream() { return null; }
  @Override public final String getAnalyticsMethodCreator() { return "OpenLAP"; }
}
