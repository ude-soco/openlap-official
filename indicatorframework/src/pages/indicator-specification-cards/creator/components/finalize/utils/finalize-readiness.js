// Finalize readiness (Phase 5E).
//
// Single source of truth for "is this indicator ready to save?" — reused by the
// Finalize review section AND the save dialog so they can never disagree. Pure
// function over existing state; reuses the Step 4 dataset validation and the
// Step 3 chart-compatibility helpers (no validation logic duplicated, none
// introduced).

import { validateDataset } from "../../dataset/utils/dataset-validation.js";
import { getChartCompatibility } from "../../visualization/utils/chart-compatibility.js";

/**
 * @returns {{
 *   ready: boolean,
 *   hasChart: boolean,
 *   groups: { key, title, checks: { ok, text }[] }[],
 *   issues: string[],            // actionable text for each failing check
 *   summary: { indicatorName, chartType, rowCount, columnCount, meaningfulRowCount },
 * }}
 */
export const getFinalizeReadiness = ({ requirements, dataset, visRef } = {}) => {
  const validation = validateDataset(dataset);
  const hasChart = Boolean(visRef?.chart?.type);
  const chartType = visRef?.chart?.type || "Not selected";
  const compatibility = hasChart
    ? getChartCompatibility(visRef.chart, dataset?.columns ?? [])
    : null;

  const hasName = Boolean(requirements?.indicatorName);
  const hasGoal = Boolean(requirements?.goal);
  const hasQuestion = Boolean(requirements?.question);
  const definitionOk = hasName && hasGoal && hasQuestion;

  const groups = [
    {
      key: "definition",
      title: "Indicator definition",
      checks: [
        {
          ok: definitionOk,
          text: definitionOk
            ? "Goal, question, and name are defined."
            : "Complete the goal, question, and name in the requirements step.",
        },
      ],
    },
    {
      key: "dataset",
      title: "Dataset",
      checks: [
        {
          ok: validation.meaningfulRowCount > 0,
          text:
            validation.meaningfulRowCount > 0
              ? `Has data — ${validation.meaningfulRowCount} row${
                  validation.meaningfulRowCount === 1 ? "" : "s"
                } ready.`
              : "Add at least one row in the dataset step.",
        },
        {
          ok: validation.invalidCellCount === 0,
          text:
            validation.invalidCellCount === 0
              ? "All cell values are valid."
              : `Fix ${validation.invalidCellCount} invalid number${
                  validation.invalidCellCount === 1 ? "" : "s"
                } in the dataset step.`,
        },
      ],
    },
    {
      key: "visualization",
      title: "Visualization",
      checks: [
        {
          ok: hasChart,
          text: hasChart
            ? `Visualization selected — ${chartType}.`
            : "Choose a visualization below.",
        },
        // Only meaningful once a chart is selected.
        ...(hasChart
          ? [
              {
                ok: compatibility.compatible,
                text: compatibility.compatible
                  ? "Required columns are available for this visualization."
                  : "Add the missing required columns for this visualization.",
              },
            ]
          : []),
      ],
    },
  ];

  const ready = groups.every((g) => g.checks.every((c) => c.ok));
  const issues = groups
    .flatMap((g) => g.checks)
    .filter((c) => !c.ok)
    .map((c) => c.text);

  return {
    ready,
    hasChart,
    groups,
    issues,
    summary: {
      indicatorName: requirements?.indicatorName || "Untitled indicator",
      chartType,
      rowCount: dataset?.rows?.length ?? 0,
      columnCount: dataset?.columns?.length ?? 0,
      meaningfulRowCount: validation.meaningfulRowCount,
    },
  };
};
