package com.openlap.analytics.methods;

import com.openlap.dataset.OpenLAPColumnDataType;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** A true-outcome proportion over the known boolean observations, optionally by exact text group. */
public final class BooleanRate extends AnalyticalMethod {
  public BooleanRate() {
    super("descriptive");
    input("outcome", OpenLAPColumnDataType.TrueFalse, true, "True/false outcome",
        "A recorded true/false result such as xAPI completion or success. Missing outcomes are unknown and excluded from the percentage denominator.");
    input("group", OpenLAPColumnDataType.Text, false, "Group",
        "Optional text group key aligned with each outcome, such as the activity identifier. Leave this blank for one rate across all selected events.");
    output("group", OpenLAPColumnDataType.Text, "Group", "The group whose known outcomes form the percentage denominator.");
    output("true_count", OpenLAPColumnDataType.Numeric, "True outcomes", "Number of explicitly recorded true outcomes in this group.");
    output("false_count", OpenLAPColumnDataType.Numeric, "False outcomes", "Number of explicitly recorded false outcomes in this group. Unknown outcomes are never counted as false.");
    output("percentage", OpenLAPColumnDataType.Numeric, "Percentage true (%)",
        "100 times true outcomes divided by known true and false outcomes. Empty when no outcomes are known. This is the rate of recorded outcomes, not automatically the rate of all assigned activities.");
    output("count", OpenLAPColumnDataType.Numeric, "Known outcomes", "Number of known true or false outcomes in this group; the percentage denominator.");
    output("excluded_count", OpenLAPColumnDataType.Numeric, "Unknown outcomes", "Number of missing outcomes excluded from this group's percentage denominator.");
    output("ungrouped_count", OpenLAPColumnDataType.Numeric, "Rows without a group (whole dataset)",
        "Rows excluded because the selected group is missing. This whole-dataset count repeats on each group row; do not sum it. Zero when grouping is not selected.");
  }

  @Override public String getAnalyticsMethodName() { return "Calculate completion or success rate"; }

  @Override public String getAnalyticsMethodDescription() {
    return "Calculate the percentage of recorded completion or success outcomes marked true, optionally for each activity. Each input row is one event or prepared observation. Count true, false and unknown outcomes separately. The percentage is empty when no outcomes are known.";
  }

  @Override protected void implementationExecution() {
    resetOutput();
    List<?> outcomes = data("outcome"), groups = data("group");
    if (outcomes.isEmpty()) throw invalid("No recorded outcomes are available. Adjust your filters or choose another outcome input.");
    if (outcomes.size() > MAX_ROWS) throw invalid("This method supports at most " + MAX_ROWS + " observations per preview.");
    boolean grouped = !groups.isEmpty();
    if (grouped) sameRows(outcomes, groups);
    Map<String, Counts> counts = new LinkedHashMap<>();
    if (!grouped) counts.put("All observations", new Counts());
    int ungrouped = 0;
    for (int row = 0; row < outcomes.size(); row++) {
      Object value = outcomes.get(row);
      if (value != null && !(value instanceof Boolean)) {
        throw invalid("Choose a true/false outcome. Only recorded boolean values or missing outcomes are accepted.");
      }
      String category = grouped ? group(groups.get(row)) : "All observations";
      if (category == null) { ungrouped++; continue; }
      Counts selected = counts.computeIfAbsent(category, ignored -> new Counts());
      if (value == null) selected.unknown++;
      else if ((Boolean) value) selected.trueCount++;
      else selected.falseCount++;
    }
    if (counts.isEmpty()) throw invalid("No outcomes have an identified group. Choose another group input or leave grouping unused.");
    for (Map.Entry<String, Counts> entry : counts.entrySet()) {
      Counts values = entry.getValue();
      int known = values.trueCount + values.falseCount;
      append("group", entry.getKey());
      append("true_count", values.trueCount);
      append("false_count", values.falseCount);
      append("percentage", known == 0 ? null : 100.0 * values.trueCount / known);
      append("count", known);
      append("excluded_count", values.unknown);
      append("ungrouped_count", ungrouped);
    }
  }

  private static final class Counts {
    int trueCount;
    int falseCount;
    int unknown;
  }
}
