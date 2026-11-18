package com.openlap.analytics.methods;

import com.openlap.dataset.OpenLAPColumnDataType;
import java.util.List;

/** Counts selected records, independently of the completeness of a field on those records. */
public final class EventCount extends AnalyticalMethod {
  public EventCount() {
    super("descriptive");
    input("event", OpenLAPColumnDataType.Text, true, "Selected events",
        "One input slot per selected xAPI record. Map the event marker or statement ID; a missing ID still represents an event and is counted.");
    output("category", OpenLAPColumnDataType.Text, "Selection", "The selected event records.");
    output("event_count", OpenLAPColumnDataType.Numeric, "Event count",
        "Number of selected input records, including records whose mapped field is missing. This is an event count, not a learner count.");
  }

  @Override public String getAnalyticsMethodName() { return "Count selected events"; }

  @Override public String getAnalyticsMethodDescription() {
    return "Count every selected event record. One input row is one event, including a row without a statement ID. An empty selection produces zero. The result does not count distinct learners or infer engagement quality.";
  }

  @Override protected void implementationExecution() {
    resetOutput();
    List<?> events = data("event");
    if (events.size() > MAX_ROWS) throw invalid("This method supports at most " + MAX_ROWS + " events per preview.");
    append("category", "Selected events");
    append("event_count", events.size());
  }
}
