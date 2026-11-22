package org.openlap.visualizations.common;

import com.openlap.dataset.OpenLAPDataSet;
import com.openlap.exceptions.UnTransformableData;
import com.openlap.template.DataTransformer;
import com.openlap.template.model.TransformedData;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;

public final class ChartRows implements DataTransformer {
  private List<?> rows;

  @Override
  public TransformedData<List<?>> transformData(OpenLAPDataSet data) {
    rows = data.getColumns().containsKey("x") ? points(data) : categories(data);
    var transformed = new TransformedData<List<?>>();
    transformed.setData(rows);
    return transformed;
  }

  List<?> rows() {
    return rows;
  }

  private List<CategoryValue> categories(OpenLAPDataSet data) {
    var category = column(data, "category");
    var value = column(data, "value");
    var series = column(data, "series");
    boolean grouped = data.getColumns().containsKey("series");
    if (category.isEmpty() || category.size() != value.size() || grouped && series.size() != category.size()) {
      throw new UnTransformableData("Select aligned columns with at least one chart row.");
    }
    var result = new ArrayList<CategoryValue>(category.size());
    var groupedPairs = new HashSet<CategorySeries>();
    for (int index = 0; index < category.size(); index++) {
      String name = requiredText(category.get(index), "category");
      String group = grouped ? requiredText(series.get(index), "series") : null;
      if (grouped && !groupedPairs.add(new CategorySeries(name, group))) {
        throw new UnTransformableData("Use one value per category and series. Summarize duplicate combinations first.");
      }
      result.add(new CategoryValue(name, number(value.get(index), "value"), group));
    }
    return result;
  }

  private List<Point> points(OpenLAPDataSet data) {
    var x = column(data, "x");
    var y = column(data, "y");
    var labels = column(data, "label");
    var series = column(data, "series");
    if (x.isEmpty() || x.size() != y.size()
        || !labels.isEmpty() && labels.size() != x.size()
        || !series.isEmpty() && series.size() != x.size()) {
      throw new UnTransformableData("Select aligned columns with at least one scatter point.");
    }
    var result = new ArrayList<Point>(x.size());
    for (int index = 0; index < x.size(); index++) {
      result.add(new Point(number(x.get(index), "X-axis value"), number(y.get(index), "Y-axis value"),
          optionalText(labels, index, "point label"), optionalText(series, index, "series")));
    }
    return result;
  }

  private static List<?> column(OpenLAPDataSet data, String id) {
    var column = data.getColumns().get(id);
    return column == null || column.getData() == null ? List.of() : column.getData();
  }

  private static String requiredText(Object value, String field) {
    if (value instanceof String text && !text.isBlank()) return text;
    throw new UnTransformableData("Every " + field + " must have a text value.");
  }

  private static String optionalText(List<?> column, int index, String field) {
    if (column.isEmpty() || column.get(index) == null) return null;
    Object value = column.get(index);
    return value instanceof String text && text.isBlank() ? null : requiredText(value, field);
  }

  private static double number(Object value, String field) {
    if (value instanceof Number number && Double.isFinite(number.doubleValue())) return number.doubleValue();
    throw new UnTransformableData("Every " + field + " must have a finite numerical value.");
  }

  record CategoryValue(String category, double value, String series) {}
  private record CategorySeries(String category, String series) {}
  private record Point(double x, double y, String label, String series) {}
}
