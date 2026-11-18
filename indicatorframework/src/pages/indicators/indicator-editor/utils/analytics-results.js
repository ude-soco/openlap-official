const columnsOf = (dataset) => dataset?.columns || dataset || {};
const counts = (column) => column?.configurationData?.type === "Numeric" &&
  Array.isArray(column.data) && column.data.length > 0 &&
  column.data.every((value) => Number.isSafeInteger(value) && value >= 0)
  ? column.data : null;
const sum = (values) => values.reduce((total, value) => total + value, 0);
const repeated = (values) => values.every((value) => value === values[0]);

export function analysisColumnHelp(column, typeHelp = "") {
  // CustomTooltip supports legacy HTML messages. Plugin descriptions are plain
  // text, so escape them before combining with the application's type help.
  const description = String(column?.description || "").replace(/[&<>"']/g,
    (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
  return [description, typeHelp].filter(Boolean).join("<br/><br/>");
}

// Diagnostics are part of the new analytics plugin's explicit output contract.
// A count column alone (e.g. legacy item frequencies) is not an exclusion report.
export function analysisObservationCounts(dataset) {
  const columns = columnsOf(dataset);
  const included = counts(columns.count);
  const excluded = counts(columns.excluded_count);
  if (!included || !excluded || included.length !== excluded.length) return null;
  if (columns.observation && columns.cluster) {
    // Clustering returns the GLOBAL counters alongside every original row.
    if (!repeated(included) || !repeated(excluded)) return null;
    return { included: included[0], excluded: excluded[0], ungrouped: 0 };
  }
  if (columns.ungrouped_count) {
    const ungrouped = counts(columns.ungrouped_count);
    if (!ungrouped || !repeated(ungrouped)) return null;
    return {
      included: sum(included),
      excluded: sum(excluded),
      ungrouped: ungrouped[0],
      groups: included.length,
    };
  }
  if (included.length !== 1) return null;
  return { included: included[0], excluded: excluded[0], ungrouped: 0 };
}

export function analysisObservationMessage(dataset) {
  const result = analysisObservationCounts(dataset);
  if (!result) return "";
  const observations = (count, qualifier = "") => `${count} ${qualifier}observation${count === 1 ? "" : "s"}`;
  return `${observations(result.included)} analysed${result.groups ? ` across ${result.groups} group${result.groups === 1 ? "" : "s"}` : ""}. ` +
    `${observations(result.excluded, "incomplete ")} excluded.` +
    (result.ungrouped ? ` ${observations(result.ungrouped, "additional ")} excluded because ${result.ungrouped === 1 ? "its" : "their"} group is missing.` : "");
}

export function statisticalPrimaryMeasures(outputs = []) {
  const numeric = new Set(outputs.filter((column) => column.type === "Numeric").map((column) => column.id));
  const text = new Set(outputs.filter((column) => column.type === "Text").map((column) => column.id));
  if (numeric.has("event_count") && (text.has("category") || text.has("period"))) return ["event_count"];
  if (numeric.has("distinct_count") && text.has("category")) return ["distinct_count"];
  if (!numeric.has("count") || !numeric.has("excluded_count")) return null;
  if (numeric.has("percentage") && numeric.has("true_count") && numeric.has("false_count")) return ["percentage"];
  if (numeric.has("mean")) return ["mean"];
  if (numeric.has("correlation")) return ["correlation"];
  if (numeric.has("x") && numeric.has("y") && outputs.some((column) => column.id === "cluster")) return ["x", "y"];
  return [];
}

export function defaultSourceMeasures(outputs = [], dataset) {
  const primary = statisticalPrimaryMeasures(outputs);
  // Preserve historical all-measure defaults for existing analytics plugins.
  if (primary === null) return outputs.filter((column) => column.type === "Numeric").map((column) => column.id);
  if (!dataset) return primary;
  const columns = columnsOf(dataset);
  // When current output data is already available, never replace an undefined
  // intended measurement with a diagnostic count or a different statistic.
  return primary.every((id) => Array.isArray(columns[id]?.data) && columns[id].data.length > 0 &&
    columns[id].data.every((value) => typeof value === "number" && Number.isFinite(value))) ? primary : [];
}

export function sourceMeasureHelp(source) {
  if (statisticalPrimaryMeasures(source.outputs) === null) return "Choose numerical measures to include.";
  return source.measureColumnIds?.length
    ? "Primary measurements are selected by default. If a measure is undefined for a group, adjust the source filters or explicitly choose another complete measure."
    : "Choose a complete numerical measure, or adjust this source's filters. Missing measurements are not treated as zero.";
}

// Keep all choices available, but start statistical charts with a measurement
// rather than a diagnostic row count. Legacy datasets retain their prior order.
export function preferredAnalysisColumns(columns, input) {
  const ids = new Set(columns.map((column) => column.configurationData?.id));
  if (statisticalPrimaryMeasures(columns.map((column) => column.configurationData)) === null) return columns;
  const measures = ["mean", "median", "correlation", "event_count", "distinct_count", "percentage", "x", "y", "sum", "range", "variance", "minimum", "maximum",
    "standard_deviation", "q1", "q3", "iqr"];
  const diagnosticIds = new Set(["count", "excluded_count", "ungrouped_count"]);
  const hint = `${input?.id} ${input?.title}`.replace(/([a-z])([A-Z])/g, "$1 $2");
  const axis = /(^|[^a-z])y([^a-z]|$)/i.test(hint) ? "y"
    : /(^|[^a-z])x([^a-z]|$)/i.test(hint) ? "x" : "";
  const grouping = /(^|[^a-z])(groups?|grouping|series|clusters?|colou?r)([^a-z]|$)/i.test(hint);
  const preferredText = input?.type === "Text" && ids.has("observation") && ids.has("cluster")
    ? grouping ? "cluster" : "observation" : "";
  const rank = ({ configurationData: column }) => {
    if (column.id === preferredText) return -2;
    if (column.id === axis) return -1;
    if (diagnosticIds.has(column.id)) return 100;
    const index = measures.indexOf(column.id);
    return index < 0 ? 50 : index;
  };
  return [...columns].sort((left, right) => rank(left) - rank(right));
}
