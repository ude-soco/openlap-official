const list = (value) => Array.isArray(value) ? value : [];
const text = (value) => value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
const name = (value) => value?.name || value?.title || value?.id || "Not specified";
const ids = (value) => [...new Set(list(value).map((entry) => text(entry?.id ?? entry)))].sort().join("|");
const activityIds = (value) => ids(list(value).map((entry) => `${entry.queryId || ""}:${entry.id || ""}`));
const labels = (value) => list(value).map((entry) => typeof entry === "object" ? name(entry) : text(entry)).join(", ") || "Not specified";
const date = (value) => value ? text(value).slice(0, 10) : "Not specified";
const ports = (value) => list(value?.mapping).map((entry) => `${entry.inputPort?.id || ""}:${entry.outputPort?.id || ""}`).sort().join("|");
const comparable = (value) => value === undefined ? "" : JSON.stringify(value);
const portLabels = (value) => list(value?.mapping).map((entry) => `${name(entry.inputPort)} → ${name(entry.outputPort)}`).join(", ") || "Not specified";

export function comparisonStatus(expected, actual, unavailable = false) {
  if (unavailable) return "unavailable";
  if (!actual || !actual.length) return "needed";
  return expected === actual ? "same" : "changed";
}

// Reference values come only from the server's public, frozen recipe. This
// presentation model deliberately never accepts rows, creator IDs or LRS IDs.
export function communityReferenceRows(step, reference, configuration = {}) {
  if (!reference) return [];
  const row = (key, label, value, expected, actual, unavailable) => ({ key, label, value,
    status: comparisonStatus(expected, actual, unavailable) });
  const selections = list(configuration.filters?.selectedActivities);
  if (step === "dataset") return [{ key: "sources", label: "Data sources", value: `${reference.dataset?.sourceCount || 0} connected source(s)`,
    status: list(configuration.dataset?.selectedLRSList).length ? "personal" : "needed" },
    { key: "outputs", label: "Analysis output columns", value: labels(reference.dataset?.outputs), status: "reference" }];
  if (step === "filters") return [
    row("types", "Activity types", labels(reference.filters?.activityTypes), ids(reference.filters?.activityTypes), ids(selections.map((entry) => entry.selectedActivityType).filter((entry) => entry?.id))),
    row("actions", "Actions", labels(reference.filters?.actions), ids(reference.filters?.actions), ids(selections.flatMap((entry) => list(entry.selectedActionList)))),
    row("activities", "Activities", labels(reference.filters?.activities), activityIds(reference.filters?.activities), activityIds(selections.flatMap((entry) => list(entry.selectedActivityList)))),
    row("time", "Timeframe", `${date(reference.filters?.timeframe?.from)} – ${date(reference.filters?.timeframe?.until)}`,
      `${date(reference.filters?.timeframe?.from)}|${date(reference.filters?.timeframe?.until)}`,
      configuration.filters?.selectedTime ? `${date(configuration.filters.selectedTime.from)}|${date(configuration.filters.selectedTime.until)}` : ""),
    { key: "scope", label: "Community data scope", value: ({ ONLY_ME: "Creator's own data", INCLUDE_ME: "All users", INCLUDE_ALL: "All users", EXCLUDE_ME: "Other users" })[reference.filters?.scope] || reference.filters?.scope || "Not specified", status: "personal" },
  ];
  if (step === "analysis") {
    const method = reference.analysis?.method;
    const own = configuration.analysis;
    return [row("method", "Analytics method", name(method), method?.id, (own?.selectedAnalyticsMethod?.method?.id || own?.methodId), method?.available === false),
      ...list(reference.analysis?.params).map((param) => row(`param:${param.id}`, param.name || param.id, (text(param.value) || "Empty value"), comparable(param.value),
        comparable(list(own?.params).find((entry) => entry.id === param.id)?.value))),
      row("mapping", "Method inputs", portLabels(reference.analysis?.mapping), ports(reference.analysis?.mapping), ports(own?.selectedAnalyticsMethod?.mapping || own?.mapping))];
  }
  if (step === "visualization") {
    const original = reference.visualization || {}; const own = configuration.visualization;
    return [row("library", "Visualization library", name(original.library), original.library?.id, (own?.selectedLibrary?.id || own?.libraryId), original.library?.available === false),
      row("chart", "Chart type", name(original.chart), original.chart?.id, (own?.selectedType?.id || own?.typeId), original.chart?.available === false),
      row("mapping", "Chart inputs", portLabels(original.mapping), ports(original.mapping), ports(own?.mapping)),
      ...Object.entries(original.params || {}).slice(0, 30).map(([key, value]) => row(`style:${key}`, key.replace(/([a-z])([A-Z])/g, "$1 $2"), (text(value) || "Empty value"), comparable(value), comparable(own?.params?.[key])))];
  }
  if (step === "combine") return list(reference.combine?.sources).map((source, index) => {
    const own = list(configuration.sources).find((entry) => entry.id === source.slotId);
    return row(source.slotId, source.label || `Source ${index + 1}`, `Match: ${source.keyColumnId || "Not specified"}; values: ${list(source.measureColumnIds).join(", ") || "Not specified"}`,
      `${source.keyColumnId}|${list(source.measureColumnIds).sort().join("|")}`, own ? `${own.keyColumnId}|${list(own.measureColumnIds).sort().join("|")}` : "");
  });
  return [];
}
