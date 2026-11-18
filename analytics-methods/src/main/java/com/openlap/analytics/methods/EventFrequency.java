package com.openlap.analytics.methods;

import com.openlap.dataset.OpenLAPColumnDataType;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Frequencies and proportions over actual event categories, with deterministic ranking. */
public final class EventFrequency extends AnalyticalMethod {
  public EventFrequency() {
    super("descriptive");
    input("category", OpenLAPColumnDataType.Text, true, "Event category",
        "An activity, action or other text category for each selected event. Empty categories are excluded; category identity is case-sensitive and preserved exactly.");
    output("category", OpenLAPColumnDataType.Text, "Category", "The exact observed category label.");
    output("event_count", OpenLAPColumnDataType.Numeric, "Event count", "Number of usable events in this category.");
    output("percentage", OpenLAPColumnDataType.Numeric, "Percentage of usable events",
        "Category count divided by all events with a category, multiplied by 100. The denominator includes categories hidden by the result limit.");
    output("excluded_count", OpenLAPColumnDataType.Numeric, "Events without a category (whole dataset)",
        "Whole-dataset count of missing or blank categories, repeated on every result row. Read once; do not sum.");
    integerParameter("limit", "Number of categories", "Use 0 for all categories, or 1-10000 for the first categories in the selected order.", 0);
    choiceParameter("order", "Counting order", "Order by frequency. Equal counts are ordered alphabetically by their exact category labels.",
        "Most frequent", "Most frequent,Least frequent");
  }

  @Override public String getAnalyticsMethodName() { return "Count events by category"; }

  @Override public String getAnalyticsMethodDescription() {
    return "Count and rank events by a text category, with percentages of all usable events. Missing categories are excluded and reported. A result limit selects the most or least frequent categories; equal counts use alphabetical order. Percentages keep the full denominator when the list is limited.";
  }

  @Override protected void implementationExecution() {
    resetOutput();
    List<?> categories = data("category");
    if (categories.size() > MAX_ROWS) throw invalid("This method supports at most " + MAX_ROWS + " events per preview.");
    int limit = integer("limit", 0, 10_000);
    String order = String.valueOf(parameter("order"));
    if (!order.equals("Most frequent") && !order.equals("Least frequent")) throw invalid("Choose Most frequent or Least frequent for counting order.");
    Map<String, Integer> frequencies = new HashMap<>();
    int excluded = 0;
    for (Object raw : categories) {
      String category = group(raw);
      if (category == null) excluded++;
      else frequencies.merge(category, 1, Integer::sum);
    }
    if (frequencies.isEmpty()) throw invalid("No event categories are available. Choose a category field or adjust your filters.");
    Comparator<Map.Entry<String, Integer>> comparator = Map.Entry.comparingByValue();
    if (order.equals("Most frequent")) comparator = comparator.reversed();
    comparator = comparator.thenComparing(Map.Entry.comparingByKey());
    List<Map.Entry<String, Integer>> ranked = new ArrayList<>(frequencies.entrySet());
    ranked.sort(comparator);
    int returned = limit == 0 ? ranked.size() : Math.min(limit, ranked.size());
    int usable = categories.size() - excluded;
    for (int row = 0; row < returned; row++) {
      Map.Entry<String, Integer> entry = ranked.get(row);
      append("category", entry.getKey());
      append("event_count", entry.getValue());
      append("percentage", 100.0 * entry.getValue() / usable);
      append("excluded_count", excluded);
    }
  }
}
