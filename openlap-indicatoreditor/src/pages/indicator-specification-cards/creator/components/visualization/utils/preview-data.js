// Pure data builder for the Step 3 live preview (see
// docs/ISC_STEP3_VISUALIZATION_ARCHITECTURE.md, Phase 3E / "live preview").
//
// The Finalize chart renderers are coupled to Finalize (they mutate visRef,
// render axis selectors + customization). To preview safely in Step 3 we build a
// minimal, read-only category+value model here and render it with the bare
// react-apexcharts primitive. This module mutates NOTHING (no visRef, no
// dataset, no localStorage) and supports the common category+value chart types;
// anything else returns mode "unsupported" so the UI falls back to the static
// example image.

import { DataTypes } from "../../../utils/data/config.js";

// apex chart codes (visRef.chart.code) we can render a simple category+value
// preview for. Others (scatter/treemap/stacked/grouped/dot) fall back to static.
const CATEGORY_VALUE_TYPES = new Set(["bar", "line", "pie", "polarArea", "radar"]);

const isCategorical = (col) =>
  col?.dataType?.value === DataTypes.categorical.value ||
  col?.dataType?.value === DataTypes.catOrdered.value;

const isNumerical = (col) =>
  col?.dataType?.value === DataTypes.numerical.value;

export const isPreviewSupported = (chart) =>
  CATEGORY_VALUE_TYPES.has(chart?.code);

// Aggregate the numeric column by the categorical column from real rows.
const fromRows = (xCol, yCol, rows) => {
  const grouped = rows.reduce((acc, row) => {
    const key = row[xCol.field] ?? "Unknown";
    acc[key] = (acc[key] || 0) + (Number(row[yCol.field]) || 0);
    return acc;
  }, {});
  const categories = Object.keys(grouped);
  return { categories, values: categories.map((c) => grouped[c]) };
};

// Fixed (non-random, non-persisted) sample shape derived from declared columns.
const SAMPLE_VALUES = [6, 9, 4];
const fromSample = (xCol) => {
  const base = xCol.headerName || "Category";
  const categories = [`${base} A`, `${base} B`, `${base} C`];
  return { categories, values: categories.map((_, i) => SAMPLE_VALUES[i]) };
};

/**
 * @returns one of:
 *   { mode: "unsupported" }
 *   { mode: "live"|"sample", apexType, categories, values, seriesName }
 */
export const buildPreviewModel = (chart, columns = [], rows = []) => {
  if (!isPreviewSupported(chart)) return { mode: "unsupported" };

  const xCol = columns.find(isCategorical);
  const yCol = columns.find(isNumerical);
  if (!xCol || !yCol) return { mode: "unsupported" };

  const hasRows = Array.isArray(rows) && rows.length > 0;
  const live = hasRows ? fromRows(xCol, yCol, rows) : null;

  // "live" only when the real rows actually carry meaningful (non-zero, finite)
  // values. Freshly-built rows default numeric columns to 0, which would render
  // a blank pie/polar/radar — in that case we show a sample shape instead.
  const liveUsable =
    live &&
    live.categories.length > 0 &&
    live.values.some((v) => Number.isFinite(v) && v !== 0);

  const { categories, values } = liveUsable ? live : fromSample(xCol);

  if (categories.length === 0) return { mode: "unsupported" };

  return {
    mode: liveUsable ? "live" : "sample",
    apexType: chart.code,
    categories,
    values,
    seriesName: yCol.headerName || "Value",
  };
};
