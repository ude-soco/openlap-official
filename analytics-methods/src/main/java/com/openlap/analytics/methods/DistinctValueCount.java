package com.openlap.analytics.methods;

import com.openlap.dataset.OpenLAPColumnDataType;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;

/** Exact distinct text-value counts, optionally within aligned text groups. */
public final class DistinctValueCount extends AnalyticalMethod {
  public DistinctValueCount() {
    super("descriptive");
    input("value", OpenLAPColumnDataType.Text, true, "Values to count",
        "Text values to count distinctly, such as activity identifiers or action labels. Values are compared exactly, including case. Blank values are excluded.");
    input("group", OpenLAPColumnDataType.Text, false, "Group (optional)",
        "An optional aligned activity or other group key. Without this input, count distinct values over the complete selection.");
    output("category", OpenLAPColumnDataType.Text, "Group", "Exact group key, or All observations when no grouping input is supplied.");
    output("distinct_count", OpenLAPColumnDataType.Numeric, "Distinct values", "Number of distinct, nonmissing text values within this group.");
    output("excluded_count", OpenLAPColumnDataType.Numeric, "Rows without a value",
        "Rows in this group with a missing or blank value. Without grouping this count covers the complete selection.");
    output("ungrouped_count", OpenLAPColumnDataType.Numeric, "Rows without a group (whole dataset)",
        "When grouping, rows with a missing group key are excluded separately. This whole-dataset count repeats on every result row; read once, do not sum.");
  }

  @Override public String getAnalyticsMethodName() { return "Count distinct values"; }

  @Override public String getAnalyticsMethodDescription() {
    return "Count exact distinct text values across the selection or within each optional group. Repeated values count once per group. For example, count distinct activity identifiers for each action. Missing values are excluded, and missing group keys are counted separately.";
  }

  @Override protected void implementationExecution() {
    resetOutput();
    List<?> rawValues = data("value"), groups = data("group");
    boolean grouped = !groups.isEmpty();
    if (rawValues.size() > MAX_ROWS) throw invalid("This method supports at most " + MAX_ROWS + " observations per preview.");
    if (grouped) sameRows(rawValues, groups);
    Map<String, Set<String>> distinct = new TreeMap<>();
    Map<String, Integer> excluded = new TreeMap<>();
    if (!grouped) { distinct.put("All observations", new HashSet<>()); excluded.put("All observations", 0); }
    int ungrouped = 0;
    for (int row = 0; row < rawValues.size(); row++) {
      String category = grouped ? group(groups.get(row)) : "All observations";
      String value = group(rawValues.get(row));
      if (category == null) { ungrouped++; continue; }
      distinct.computeIfAbsent(category, key -> new HashSet<>());
      excluded.putIfAbsent(category, 0);
      if (value == null) excluded.merge(category, 1, Integer::sum);
      else distinct.get(category).add(value);
    }
    if (distinct.isEmpty()) throw invalid("No group keys are available. Choose a group field with values, or leave grouping empty.");
    for (Map.Entry<String, Set<String>> entry : distinct.entrySet()) {
      append("category", entry.getKey());
      append("distinct_count", entry.getValue().size());
      append("excluded_count", excluded.get(entry.getKey()));
      append("ungrouped_count", ungrouped);
    }
  }
}
