// Friendly axis-mapping copy for Step 5 (Phase 5C).
//
// ISC Creator's audience is prototyping researchers, not chart engineers, so the
// visible axis labels use plain language instead of chart-library terms:
//   • the categorical/label axis (was "X-Axis") → "Group by"
//   • the numerical/value axis  (was "Y-Axis") → "Measure"
//
// Presentation/copy only — the underlying axis values, handlers, defaults, and
// validation are unchanged. A per-chart override map is provided for charts
// whose axes don't map onto "Group by / Measure" (e.g. scatter has two numeric
// axes); today it's empty and the standard category→value charts use the default.

export const AXIS_INTRO = "Choose how your data should be shown in the chart.";

export const DEFAULT_AXIS_LABELS = {
  group: {
    label: "Group by",
    help: "Categories or labels shown along the chart.",
  },
  measure: {
    label: "Measure",
    help: "Numeric values used to calculate the chart.",
  },
};

// chartCode → custom labels. Empty for now (the standard charts use the default).
const PER_CHART_AXIS_LABELS = {};

export const getAxisLabels = (chartCode) =>
  PER_CHART_AXIS_LABELS[chartCode] || DEFAULT_AXIS_LABELS;
