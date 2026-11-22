package com.openlap.analytics.methods;

import com.openlap.dataset.OpenLAPColumnDataType;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class GroupedNumericSummary extends SummaryMethod {
  public GroupedNumericSummary() {
    input("group", OpenLAPColumnDataType.Text, true, "Group", "A text group key aligned with each measurement, such as the activity identifier of each quiz attempt. Group keys are preserved exactly.");
    output("ungrouped_count", OpenLAPColumnDataType.Numeric, "Rows without a group (whole dataset)", "Rows with a missing group are excluded. This whole-dataset count repeats on each group row; do not sum it.");
  }
  @Override public String getAnalyticsMethodName() { return "Summarize numeric values by group"; }
  @Override public String getAnalyticsMethodDescription() {
    return "Produce count, sum, mean, median, range, sample variance, sample standard deviation and quartiles per distinct text group. For example, group raw scores by activity identifier for one summary per quiz. Count and excluded observations apply to each group. Rows without a group are excluded separately.";
  }
  @Override protected void implementationExecution() {
    resetOutput();
    List<?> raw = data("values");
    List<?> groups = data("group");
    sameRows(raw, groups);
    Map<String, List<Double>> values = new LinkedHashMap<>();
    Map<String, Integer> excluded = new LinkedHashMap<>();
    int ungrouped = 0;
    for (int row = 0; row < raw.size(); row++) {
      String group = group(groups.get(row));
      Double number = numeric(raw.get(row));
      if (group == null) { ungrouped++; continue; }
      values.computeIfAbsent(group, key -> new ArrayList<>());
      excluded.putIfAbsent(group, 0);
      if (number == null) excluded.merge(group, 1, Integer::sum);
      else values.get(group).add(number);
    }
    if (values.values().stream().allMatch(List::isEmpty)) throw invalid("No grouped numeric measurements are available. Choose matching group and measurement inputs.");
    final int missingGroups = ungrouped;
    values.forEach((group, numbers) -> {
      summary(group, numbers, excluded.get(group));
      append("ungrouped_count", missingGroups);
    });
  }
}
