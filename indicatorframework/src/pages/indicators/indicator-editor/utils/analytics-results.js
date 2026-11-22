const columnsOf = (dataset) => dataset?.columns || dataset || {};
const percentageFormat = new Intl.NumberFormat(undefined, { style: "percent", maximumFractionDigits: 2 });
const diagnosticOrder = ["INCLUDED", "EXCLUDED", "UNGROUPED"];

export function analysisColumnHelp(column, typeHelp = "") {
  // CustomTooltip supports legacy HTML messages. Plugin descriptions are plain
  // text, so escape them before combining with the application's type help.
  const description = String(column?.description || "").replace(/[&<>"']/g,
    (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
  return [description, typeHelp].filter(Boolean).join("<br/><br/>");
}

export function formatAnalysisValue(value, hint) {
  if (value == null) return "—";
  if (hint?.format === "PERCENTAGE" && typeof value === "number" && Number.isFinite(value)) {
    if (value > 0 && value < 0.01) return `<${percentageFormat.format(0.0001)}`;
    return percentageFormat.format(value / 100);
  }
  return String(value);
}

function diagnosticCount(column, aggregation) {
  const data = column.data;
  if (column.configurationData?.type !== "Numeric" || !Array.isArray(data) || !data.length ||
      !data.every((value) => Number.isSafeInteger(value) && value >= 0)) return null;
  if (aggregation === "ONCE") return data.every((value) => value === data[0]) ? data[0] : null;
  if (aggregation !== "SUM") return null;
  const total = data.reduce((sum, value) => sum + value, 0);
  return Number.isSafeInteger(total) ? total : null;
}

export function analysisResultPresentation(dataset, outputHints, mapping, sourceDataset) {
  const columns = columnsOf(dataset);
  const sourceColumns = columnsOf(sourceDataset);
  const sourceTitle = (inputId) => {
    if (!inputId) return "";
    const source = mapping?.mapping?.find((entry) => entry.inputPort.id === inputId)?.outputPort;
    if (!source) return "";
    return sourceColumns[source.id]?.configurationData?.title || source.name || source.title || source.id;
  };

  const diagnostics = [];
  const plotColumns = {};
  const columnTitles = {};
  const hiddenColumns = [];
  for (const [id, hint] of Object.entries(outputHints || {})) {
    const column = columns[id];
    if (!column) continue;
    const title = sourceTitle(hint.labelFromInput);
    if (title) columnTitles[id] = title;
    if (["X", "Y", "LABEL", "CLUSTER"].includes(hint.role)) plotColumns[hint.role] = id;

    const diagnostic = hint.diagnostic;
    if (!diagnostic) continue;
    const count = diagnosticCount(column, diagnostic.aggregation);
    if (count === null) continue;
    diagnostics.push({ ...diagnostic, count, rows: column.data.length });
    if (diagnostic.summaryOnly) hiddenColumns.push(id);
  }

  const groupedScatter = Boolean(plotColumns.X && plotColumns.Y && plotColumns.CLUSTER);
  const columnOrder = groupedScatter
    ? ["LABEL", "X", "Y", "CLUSTER"].map((role) => plotColumns[role]).filter(Boolean) : [];
  const grouped = diagnostics.some(({ kind }) => kind === "UNGROUPED");
  const message = diagnostics.sort((left, right) => diagnosticOrder.indexOf(left.kind) - diagnosticOrder.indexOf(right.kind))
    .flatMap(({ kind, count, rows, input }) => {
      const observation = `${count} observation${count === 1 ? "" : "s"}`;
      if (kind === "INCLUDED") {
        return [`${observation} analysed${grouped && rows > 1 ? ` across ${rows} groups` : ""}.`];
      }
      if (!count) return [];
      const field = input && sourceTitle(input);
      if (field) return [`${observation} ${count === 1 ? "was" : "were"} skipped because ${field} was missing or unusable.`];
      if (kind === "UNGROUPED") {
        return [`${observation} skipped because ${count === 1 ? "its" : "their"} group was missing.`];
      }
      return kind === "EXCLUDED" ? [`${count} incomplete observation${count === 1 ? "" : "s"} excluded.`] : [];
    }).join(" ");

  return { columnTitles, hiddenColumns, columnOrder, groupedScatter, message };
}

function primaryMeasures(outputs, outputHints) {
  return outputs.filter(({ id, type }) => type === "Numeric" && outputHints?.[id]?.primary);
}

export function defaultSourceMeasures(outputs = [], dataset, outputHints) {
  const primary = primaryMeasures(outputs, outputHints);
  if (!primary.length) {
    return outputs.filter(({ id, type }) => type === "Numeric" && !outputHints?.[id]?.diagnostic).map(({ id }) => id);
  }
  const ids = primary.map(({ id }) => id);
  if (!dataset) return ids;
  const columns = columnsOf(dataset);
  // An unavailable primary measurement cannot be replaced by a different statistic.
  return ids.every((id) => Array.isArray(columns[id]?.data) && columns[id].data.length > 0 &&
    columns[id].data.every((value) => typeof value === "number" && Number.isFinite(value))) ? ids : [];
}

export function sourceMeasureHelp(source) {
  if (!primaryMeasures(source.outputs, source.analyticsMethod?.metadata?.outputHints).length) {
    return "Choose numerical measures to include.";
  }
  return source.measureColumnIds?.length
    ? "Primary measurements are selected by default. If a measure is undefined for a group, adjust the source filters or explicitly choose another complete measure."
    : "Choose a complete numerical measure, or adjust this source's filters. Missing measurements are not treated as zero.";
}

/** Relates chart inputs to output roles. Older charts describe their axes in their input names. */
export function chartInputRole(input, declaredRoles) {
  const hint = `${input?.id} ${input?.title}`.replace(/([a-z])([A-Z])/g, "$1 $2");
  if (input?.type === "Text") {
    if (declaredRoles?.series === input.id) return "CLUSTER";
    if (declaredRoles?.category === input.id) return "LABEL";
    return /(^|[^a-z])(groups?|grouping|series|clusters?|colou?r)([^a-z]|$)/i.test(hint) ? "CLUSTER" : "LABEL";
  }
  if (input?.type !== "Numeric") return "";
  if (/(^|[^a-z])y([^a-z]|$)/i.test(hint)) return "Y";
  if (/(^|[^a-z])x([^a-z]|$)/i.test(hint)) return "X";
  return "";
}

export function preferredAnalysisColumns(columns, input, outputHints, chartRoles) {
  if (!outputHints) return columns;
  const role = chartInputRole(input, chartRoles);
  const rank = ({ configurationData: { id } }) => {
    const hint = outputHints[id];
    if (hint?.diagnostic) return 3;
    if (role && hint?.role === role) return 0;
    return hint?.primary ? 1 : 2;
  };
  return [...columns].sort((left, right) => rank(left) - rank(right));
}
