// Friendly axis / field-mapping copy for Step 5 (Phase 5C + follow-up).
//
// ISC Creator's audience is prototyping researchers, not chart engineers, so the
// visible field labels use plain language instead of chart-library terms. Copy
// is centralized here and looked up by an EXPLICIT per-chart key (NOT
// visRef.chart.code — several charts share a code, e.g. dot/scatter both use
// "scatter" and bar/groupedBar/stackedBar all use "bar").
//
// Presentation/copy only — the underlying field values, handlers, defaults, and
// validation in each chart are unchanged.

export const AXIS_INTRO = "Choose how your data should be shown in the chart.";

const field = (label, help) => ({ label, help });

// Category → measure charts (bar, line, radar, dot, grouped bar) use this.
export const DEFAULT_AXIS_LABELS = {
  group: field("Group by", "Categories or labels shown along the chart."),
  measure: field("Measure", "Numeric values used to calculate the chart."),
};

// Per-chart, role-keyed friendly labels for charts whose fields don't map onto
// the plain "Group by / Measure" pair. Roles match how each chart names its
// fields in code.
const CHART_AXIS_LABELS = {
  pie: {
    category: field("Categories", "The groups shown as slices."),
    value: field("Values", "Numeric value for each slice."),
  },
  polarArea: {
    category: field("Categories", "The groups shown as segments."),
    value: field("Values", "Numeric value for each segment."),
  },
  stackedBar: {
    group: field("Group by", "Categories shown along the chart."),
    stack: field("Stack by", "Sub-groups stacked within each bar."),
    measure: field("Measure", "Numeric values used to size the bars."),
  },
  scatter: {
    horizontal: field(
      "Horizontal measure",
      "Numeric value plotted along the horizontal axis."
    ),
    vertical: field(
      "Vertical measure",
      "Numeric value plotted along the vertical axis."
    ),
    label: field("Label", "Optional category used to label the points."),
  },
  treemap: {
    category: field("Group / Category", "The groups shown as boxes."),
    size: field("Size value", "Numeric value that sizes each box."),
    nested: field("Nested category", "Optional sub-group nested in each box."),
  },
};

// `chartKey` is an explicit identity ("pie", "stackedBar", …), NOT the apex
// code. Charts not listed fall back to the category→measure default.
export const getAxisLabels = (chartKey) =>
  CHART_AXIS_LABELS[chartKey] || DEFAULT_AXIS_LABELS;
