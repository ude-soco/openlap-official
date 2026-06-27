// Workflow-path change consistency (see docs/ISC_CREATOR_ARCHITECTURE.md).
//
// Changing the workflow path (Choose Path) must reset the downstream,
// path-specific visualization/finalize state while preserving the
// workflow-independent state (Step 1 requirements + Step 4 dataset). This module
// centralizes that reset so it never gets scattered across click handlers.
//
// Reset here  : selected analytical task/filter, selected chart, visualization
//               compatibility/preview state, and finalize chart/axis/config
//               (all of which live in `visRef` + a few localStorage keys).
// Preserved   : requirements, selectedPath, dataset columns/rows — these are
//               never touched here (the caller does not pass them in).

// Canonical default `visRef`. Single source of truth for BOTH the initial
// creator state and the path-change reset, so the two can never drift. Shape and
// values are identical to the previous inline default — nothing persisted
// changes.
export const getDefaultVisRef = () => ({
  filter: {
    type: "",
  },
  chart: {
    type: "",
  },
  data: {
    series: [],
    options: {},
    axisOptions: {
      selectedXAxis: "",
      selectedYAxis: "",
      selectedLabel: "", // * StackedBar/Line
      selectedBarValue: "", // * StackedBar/Line
      selectedCategory: "", // * TreeMap
      selectedXValue: "", // * TreeMap
      selectedValue: "", // * TreeMap
      xAxisOptions: [],
      yAxisOptions: [],
      labelOptions: [], // * StackedBar/Line
      barValueOptions: [], // * StackedBar/Line
      categoryOptions: [], // * TreeMap
      xValueOptions: [], // * TreeMap
      valueOptions: [], // * TreeMap
    },
  },
  edit: false,
});

// Chart customization that the finalize chart components persist OUTSIDE visRef
// (filters-tab reads these from localStorage). They must be cleared on a path
// change too, otherwise stale categories/series/sort leak into the next chart.
const CHART_STORAGE_KEYS = ["categories", "series", "sort"];

export const clearChartCustomizationStorage = () => {
  CHART_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
};

// Whether there is reset-worthy downstream (visualization/finalize) state: an
// analytical task, a selected chart, or any axis/series configuration. Used to
// decide whether a path change needs the confirmation dialog.
export const hasDownstreamWorkflowState = (visRef) => {
  if (!visRef) return false;
  if (visRef.filter?.type) return true;
  if (visRef.chart?.type) return true;
  if (visRef.data?.series?.length) return true;
  return false;
};

// Centralized downstream reset for a workflow-path change. Resets ONLY the
// visualization/finalize state; requirements + dataset are untouched.
export const resetDownstreamWorkflowState = ({ setVisRef }) => {
  setVisRef(getDefaultVisRef());
  clearChartCustomizationStorage();
};
