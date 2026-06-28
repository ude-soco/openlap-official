// Short educational copy for Step 3 (see docs/ISC_STEP3_VISUALIZATION_ARCHITECTURE.md,
// Phase 3B). Kept separate from the chart data config so wording lives in one
// place and can be localized later. Keyed by the existing ChartTypes /
// VisualizationTypes values so no data shapes change.

import { ChartTypes, VisualizationTypes } from "../../../utils/data/config.js";

// One concise line per analytical task (shown on task cards). The longer
// `description` in config.js remains available for tooltips.
export const TASK_DESCRIPTIONS = {
  [ChartTypes.trends]: "How values change over time or in sequence.",
  [ChartTypes.outliers]: "Points that stand out from the rest.",
  [ChartTypes.distribution]: "How values are spread across categories.",
  [ChartTypes.correlation]: "How two measures move together.",
  [ChartTypes.cluster]: "Natural groupings within the data.",
  [ChartTypes.relationship]: "How parts contribute to a whole.",
  [ChartTypes.topology]: "The structure of connections between elements.",
  [ChartTypes.paths]: "Routes or sequences between points.",
};

// Educational guidance per chart, shown in the selected-chart panel. Each entry
// answers: when to use it, what question it answers, and when another chart is a
// better choice.
export const CHART_GUIDANCE = {
  [VisualizationTypes.bar]: {
    whenToUse: "Compare a single value across categories.",
    question: "How does this value differ between categories?",
    alternative: "To show parts of a whole, a pie chart can be clearer.",
  },
  [VisualizationTypes.line]: {
    whenToUse: "Show how a value changes over time or in sequence.",
    question: "How does this value trend over time?",
    alternative: "To compare categories at one point in time, use a bar chart.",
  },
  [VisualizationTypes.pie]: {
    whenToUse: "Show parts of a whole across a few categories.",
    question: "What share does each category contribute to the total?",
    alternative: "With many categories, a bar chart is easier to read.",
  },
  [VisualizationTypes.polar]: {
    whenToUse: "Compare categories arranged around a circle.",
    question: "How do categories compare in magnitude?",
    alternative: "For precise comparisons, a bar chart is clearer.",
  },
  [VisualizationTypes.radar]: {
    whenToUse: "Compare several measures for a single item.",
    question: "How does one item score across multiple measures?",
    alternative: "To compare many items, grouped bars work better.",
  },
  [VisualizationTypes.scatter]: {
    whenToUse: "Show the relationship between two numerical measures.",
    question: "Are these two measures related?",
    alternative: "To compare categories, use a bar chart.",
  },
  [VisualizationTypes.dot]: {
    whenToUse: "Show individual values along a scale.",
    question: "How are individual values distributed?",
    alternative: "For category totals, a bar chart is clearer.",
  },
  [VisualizationTypes.stackedBar]: {
    whenToUse: "Show category totals split into their parts.",
    question: "How is each total composed?",
    alternative: "To compare the parts precisely, use grouped bars.",
  },
  [VisualizationTypes.groupedBar]: {
    whenToUse: "Compare sub-categories side by side within groups.",
    question: "How do sub-categories compare within each group?",
    alternative: "To show composition, a stacked bar chart works better.",
  },
  [VisualizationTypes.treemap]: {
    whenToUse: "Show nested parts of a whole, sized by value.",
    question: "How do nested parts compare in size?",
    alternative: "For flat (non-nested) categories, use a bar chart.",
  },
};
