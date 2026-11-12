// Single source of truth for Step 3 chart compatibility (see
// docs/ISC_STEP3_VISUALIZATION_ARCHITECTURE.md, Phase 3A).
//
// Previously the "recommended" badge used the COARSE column type
// (`col.type` = "string"/"number", which merges Categorical and Categorical
// (ordinal)), while the requirements/error panel used the PRECISE
// `col.dataType.value`. That let a chart look recommended yet fail its
// requirements. This module implements the precise rule and is used by BOTH the
// badge and the requirements panel so they can never disagree.
//
// Pure functions over (chart, columns). `columns` are the dataset columns built
// by the orchestrator, each carrying `dataType.value` (e.g. "Categorical",
// "Numerical", "Categorical (ordinal)").

import { DataTypes } from "../../../utils/data/config.js";

const VALID_TYPE_VALUES = new Set(
  Object.values(DataTypes).map((dt) => dt.value)
);

// Required column count per precise data-type value (only required > 0).
const getRequiredTypes = (chart) =>
  (chart?.dataTypes || []).reduce((acc, dataType) => {
    if (dataType.required > 0) {
      const value = dataType.type.value;
      acc[value] = (acc[value] || 0) + dataType.required;
    }
    return acc;
  }, {});

// Available column count per precise data-type value.
const countAvailableTypes = (columns = []) =>
  columns.reduce((acc, col) => {
    const value = col?.dataType?.value;
    if (VALID_TYPE_VALUES.has(value)) acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});

/**
 * Full compatibility view-model for one chart against the current columns.
 * @returns {{
 *   compatible: boolean,
 *   requirements: { type: string, required: number, available: number, satisfied: boolean }[],
 *   matched: same[],
 *   missing: same[],
 * }}
 */
export const getChartCompatibility = (chart, columns = []) => {
  const required = getRequiredTypes(chart);
  const available = countAvailableTypes(columns);

  const requirements = Object.entries(required).map(
    ([type, requiredCount]) => {
      const availableCount = available[type] || 0;
      return {
        type,
        required: requiredCount,
        available: availableCount,
        satisfied: availableCount >= requiredCount,
      };
    }
  );

  const missing = requirements.filter((r) => !r.satisfied);
  const matched = requirements.filter((r) => r.satisfied);

  return { compatible: missing.length === 0, requirements, matched, missing };
};

/** True when the dataset satisfies every required data type for the chart. */
export const isChartCompatible = (chart, columns = []) =>
  getChartCompatibility(chart, columns).compatible;

/**
 * HTML message strings for unmet requirements — same wording/format the
 * requirements panel showed before, so the panel's display is unchanged.
 */
export const getMissingRequirementMessages = (chart, columns = []) =>
  getChartCompatibility(chart, columns).missing.map(
    (m) =>
      `<b>${m.required}</b> <b>${m.type}</b> data column(s) required, but found <b>${m.available}</b>`
  );

/**
 * Charts that are enabled, match the selected task (if any), and are compatible
 * with the current columns. (The gallery is already filtered by task, but this
 * keeps the rule self-contained and reusable.)
 */
export const getRecommendedCharts = (charts = [], columns = [], selectedTask = "") =>
  charts.filter((chart) => {
    if (!chart.enable) return false;
    const taskOk = !selectedTask || (chart.filters || []).includes(selectedTask);
    return taskOk && isChartCompatible(chart, columns);
  });

/**
 * Splits enabled charts into three groups for the recommended-first gallery:
 *  - recommended:     compatible AND (matches the selected task, or no task set)
 *  - otherCompatible: compatible but does NOT match the selected task
 *  - notCompatible:   dataset does not satisfy the chart's requirements
 */
export const getChartGroups = (charts = [], columns = [], selectedTask = "") => {
  const recommended = [];
  const otherCompatible = [];
  const notCompatible = [];

  charts.forEach((chart) => {
    if (!chart.enable) return;
    const compatible = isChartCompatible(chart, columns);
    const matchesTask =
      Boolean(selectedTask) && (chart.filters || []).includes(selectedTask);
    if (compatible && (!selectedTask || matchesTask)) {
      recommended.push(chart);
    } else if (compatible) {
      otherCompatible.push(chart);
    } else {
      notCompatible.push(chart);
    }
  });

  return { recommended, otherCompatible, notCompatible };
};

/** Short, plain-text summary of what's missing (e.g. "1 Categorical (ordinal) column"). */
export const getMissingSummary = (chart, columns = []) =>
  getChartCompatibility(chart, columns)
    .missing.map((m) => {
      const gap = Math.max(m.required - m.available, 1);
      return `${gap} ${m.type} column${gap > 1 ? "s" : ""}`;
    })
    .join(", ");
