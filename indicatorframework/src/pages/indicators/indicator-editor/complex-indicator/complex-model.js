import { readBasicDraft } from "../basic-indicator/utils/basic-draft-model.js";
import { defaultSourceMeasures, preferredAnalysisColumns } from "../utils/analytics-results.js";

export const CONFIG_VERSION = 1;
export const COMPLEX_TYPES = ["COMPOSITE", "MULTI_LEVEL"];
export const MAX_SOURCES = 10;

// Basic source panel visibility is authoring state. Keep it in the saved draft,
// but exclude it when deciding whether analysis results need to be regenerated.
// Every other field remains significant, including unknown future selections.
export const sourceExecutionSelections = (sourceDraft) => sourceDraft &&
  Object.fromEntries(Object.entries(sourceDraft).filter(([key]) => key !== "lockedStep"));

export const newComplexConfiguration = (type) => ({
  schemaVersion: CONFIG_VERSION,
  type,
  name: "",
  sources: [],
  analysis: { methodId: "", mapping: { mapping: [] }, params: [] },
  visualization: {
    libraryId: "",
    typeId: "",
    mapping: { mapping: [] },
    params: {},
    dataMode: "combined",
  },
});

export const recoveryKey = (type, owner, id) =>
  `openlap:complex:v${CONFIG_VERSION}:${encodeURIComponent(owner || "anonymous")}:${type}:${id || "new"}`;

// Recovery contains configuration, not computed records, rendered elements or
// plugin scripts. Never hydrate a Basic session or a different account/type.
export function readComplexConfiguration(value, type) {
  try {
    if (typeof value === "string" && value.length > 1048576) return null;
    const data = typeof value === "string" ? JSON.parse(value) : value;
    if (
      !data ||
      data.schemaVersion !== CONFIG_VERSION ||
      data.type !== type ||
      !COMPLEX_TYPES.includes(type)
    )
      return null;
    if (!Array.isArray(data.sources) || data.sources.length > MAX_SOURCES)
      return null;
    if (
      data.sources.some(
        (source) =>
          typeof source.id !== "string" ||
          !source.id ||
          !Array.isArray(source.outputs),
      )
    )
      return null;
    if (
      new Set(data.sources.map((source) => source.id)).size !==
      data.sources.length
    )
      return null;
    if (
      typeof data.name !== "string" ||
      !data.analysis ||
      !data.visualization ||
      !Array.isArray(data.analysis.params) ||
      !Array.isArray(data.analysis.mapping?.mapping) ||
      !Array.isArray(data.visualization.mapping?.mapping) ||
      data.sources.some((source) =>
        source.outputs.some(
          (column) =>
            !column ||
            typeof column.id !== "string" ||
            typeof column.type !== "string",
        ),
      )
    )
      return null;
    let sourceDrafts;
    if (data.sourceDrafts !== undefined) {
      if (!data.sourceDrafts || typeof data.sourceDrafts !== "object" || Array.isArray(data.sourceDrafts)
          || Object.keys(data.sourceDrafts).length !== data.sources.length) return null;
      const drafts = [];
      for (const source of data.sources) {
        if (!/^source-[A-Za-z0-9-]{1,80}$/.test(source.id)) return null;
        if (!Object.prototype.hasOwnProperty.call(data.sourceDrafts, source.id)) return null;
        const basic = readBasicDraft(data.sourceDrafts[source.id]);
        if (!basic) return null;
        drafts.push([source.id, basic]);
      }
      sourceDrafts = Object.fromEntries(drafts);
    }
    return {
      ...newComplexConfiguration(type),
      ...(sourceDrafts ? { sourceDrafts } : {}),
      name: data.name,
      sources: data.sources.map(
        ({
          id,
          name,
          analyticsMethod,
          outputs,
          keyColumnId,
          measureColumnIds,
          label,
          filterSummary,
        }) => ({
          id,
          name,
          analyticsMethod,
          outputs,
          keyColumnId: keyColumnId || "",
          measureColumnIds: Array.isArray(measureColumnIds)
            ? measureColumnIds
            : [],
          label: label || name || "",
          filterSummary,
        }),
      ),
      analysis: { ...newComplexConfiguration(type).analysis, ...data.analysis },
      visualization: {
        ...newComplexConfiguration(type).visualization,
        ...data.visualization,
      },
    };
  } catch {
    return null;
  }
}

export function canSelectSource(type, selected, source) {
  if (source.available === false)
    return {
      allowed: false,
      reason:
        source.unavailableReason ||
        "This source's plugin outputs are unavailable. Check the method and retry.",
    };
  if (selected.some((item) => item.id === source.id))
    return { allowed: false, reason: "Already selected" };
  if (selected.length >= MAX_SOURCES)
    return {
      allowed: false,
      reason: `Select up to ${MAX_SOURCES} indicators.`,
    };
  if (
    type === "COMPOSITE" &&
    selected.length &&
    selected[0].analyticsMethod?.id !== source.analyticsMethod?.id
  ) {
    return {
      allowed: false,
      reason: `Requires ${selected[0].analyticsMethod?.name || "the same analytics method as the first indicator"}.`,
    };
  }
  return { allowed: true, reason: "" };
}

export function sourceSelection(source) {
  const outputs = source.outputs || [];
  const text = outputs.filter((column) => column.type === "Text");
  return {
    id: source.id,
    name: source.name,
    analyticsMethod: source.analyticsMethod,
    outputs,
    label: source.name,
    filterSummary:
      source.filterSummary || sourceFilterSummary(source.indicatorQuery),
    keyColumnId: text.length === 1 ? text[0].id : "",
    measureColumnIds: defaultSourceMeasures(outputs, source.analyzedDataset, source.analyticsMethod?.metadata?.outputHints),
  };
}

export function sourceFilterSummary(query) {
  if (!query) return "";
  const parts = [];
  if (query.duration?.from || query.duration?.until)
    parts.push(
      `${query.duration.from?.slice(0, 10) || "Start"} to ${query.duration.until?.slice(0, 10) || "present"}`,
    );
  const scopes = {
    ONLY_ME: "Only the creator's data",
    EXCLUDE_ME: "All except the creator's data",
    INCLUDE_ME: "All users",
  };
  if (scopes[query.userQueryCondition])
    parts.push(scopes[query.userQueryCondition]);
  if (query.activityTypes?.length)
    parts.push(`${query.activityTypes.length} activity types`);
  return parts.join(" · ");
}

export function sourcesReady(sources = []) {
  return (
    sources.length >= 2 &&
    sources.every(
      (source) => source.keyColumnId && source.measureColumnIds?.length,
    )
  );
}

export function adaptationSourceReady(configuration) {
  return Boolean(configuration?.dataset?.selectedLRSList?.length &&
    configuration.filters?.selectedActivities?.length && configuration.filters.selectedActivities.every((entry) =>
      entry.selectedActivityType?.id && entry.selectedActionList?.length && entry.selectedActivityList?.length) &&
    configuration.analysis?.selectedAnalyticsMethod?.method?.id &&
    configuration.analysis.selectedAnalyticsMethod.mapping?.mapping?.length);
}

export function compositionRequest(configuration) {
  const indicators = configuration.sources.map((source) => ({
    indicatorId: source.id,
    columnToMerge: source.outputs.find(
      (column) => column.id === source.keyColumnId,
    ),
    measureColumnIds: source.measureColumnIds,
    label: source.label.trim() || source.name,
  }));
  return {
    indicators,
    ...(configuration.type === "COMPOSITE"
      ? { columnToMerge: indicators[0]?.columnToMerge }
      : {}),
  };
}

export const datasetColumns = (dataset) =>
  Object.values(dataset?.columns || {});
export const datasetRows = (dataset) =>
  Math.max(
    0,
    ...datasetColumns(dataset).map((column) => column.data?.length || 0),
  );

export function defaultMappings(inputs = [], dataset, outputHints, chartRoles) {
  const used = new Set();
  const columns = datasetColumns(dataset);
  return {
    mapping: inputs.flatMap((inputPort) => {
      const candidates = preferredAnalysisColumns(columns, inputPort, outputHints, chartRoles).filter(
        (column) => column.configurationData.type === inputPort.type,
      );
      const selected =
        candidates.find((column) => !used.has(column.configurationData.id)) ||
        candidates[0];
      if (!selected) return [];
      used.add(selected.configurationData.id);
      return [{ inputPort, outputPort: selected.configurationData }];
    }),
  };
}

export function mappingsReady(inputs = [], mapping = { mapping: [] }, dataset) {
  const columns = new Map(
    datasetColumns(dataset).map((column) => [
      column.configurationData.id,
      column.configurationData,
    ]),
  );
  return inputs
    .filter((input) => input.required)
    .every((input) => {
      const entry = mapping.mapping?.find(
        (item) => item.inputPort.id === input.id,
      );
      return entry && columns.get(entry.outputPort.id)?.type === input.type;
    });
}

export { parametersReady } from "../utils/analysis-readiness.js";

export function withMapping(mapping, inputPort, outputPort) {
  return {
    mapping: [
      ...(mapping.mapping || []).filter(
        (item) => item.inputPort.id !== inputPort.id,
      ),
      ...(outputPort ? [{ inputPort, outputPort }] : []),
    ],
  };
}

export const analysisRequest = (configuration) => ({
  ...compositionRequest(configuration),
  analyticsTechniqueId: configuration.analysis.methodId,
  analyticsTechniqueMapping: configuration.analysis.mapping,
  analyticsTechniqueParams: configuration.analysis.params,
});

export function previewRequest(configuration) {
  return {
    ...(configuration.type === "MULTI_LEVEL"
      ? analysisRequest(configuration)
      : compositionRequest(configuration)),
    visualizationLibraryId: configuration.visualization.libraryId,
    visualizationTypeId: configuration.visualization.typeId,
    visualizationMapping: configuration.visualization.mapping,
    visualizationParams: configuration.visualization.params,
  };
}

// Drafts contain the user's choices; method contracts are refreshed from the
// installed plugin on resume. Keeping them out also avoids resaving a draft
// merely because descriptive contract metadata has been refreshed.
const draftPort = (port) => Object.fromEntries(
  ["id", "type", "name", "title", "required", "description"]
    .filter((key) => Object.prototype.hasOwnProperty.call(port || {}, key))
    .map((key) => [key, port[key]]),
);
const draftMapping = (mapping) => ({ mapping: (mapping?.mapping || []).map((entry) => ({
  inputPort: draftPort(entry.inputPort), outputPort: draftPort(entry.outputPort),
})) });

export function toComplexDraftConfiguration(configuration) {
  const restored = readComplexConfiguration(configuration, configuration.type);
  if (!restored) throw new Error("This indicator configuration cannot be saved as a draft.");
  return {
    ...restored,
    sources: restored.sources.map((source) => ({
      ...source,
      analyticsMethod: { id: source.analyticsMethod?.id || "", name: source.analyticsMethod?.name || "" },
      outputs: source.outputs.map(draftPort),
    })),
    analysis: {
      methodId: restored.analysis.methodId,
      mapping: draftMapping(restored.analysis.mapping),
      params: restored.analysis.params.map(({ id, value }) => ({ id, value })),
    },
    visualization: {
      libraryId: restored.visualization.libraryId,
      typeId: restored.visualization.typeId,
      mapping: draftMapping(restored.visualization.mapping),
      params: restored.visualization.params,
      dataMode: restored.visualization.dataMode,
    },
  };
}

export const saveRequest = (configuration) => ({
  ...previewRequest(configuration),
  name: configuration.name.trim(),
  indicatorType: configuration.type,
  configuration: JSON.stringify(toComplexDraftConfiguration(configuration)),
});

export function fallbackConfiguration(detail, type, sources = []) {
  const restored = readComplexConfiguration(detail.configuration, type);
  if (restored) return { ...restored, name: detail.name || restored.name };
  const references = detail.sourceIndicators || [];
  if (!references.length) return null;
  const configuration = newComplexConfiguration(type);
  configuration.name = detail.name || "";
  configuration.sources = references
    .map((reference) => {
      const source = sources.find((item) => item.id === reference.indicatorId);
      return (
        source && {
          ...sourceSelection(source),
          keyColumnId:
            reference.columnToMerge?.id || detail.columnToMerge?.id || "",
          measureColumnIds: reference.measureColumnIds?.length
            ? reference.measureColumnIds
            : sourceSelection(source).measureColumnIds,
          label: reference.label || source.name,
        }
      );
    })
    .filter(Boolean);
  if (configuration.sources.length !== references.length) return null;
  configuration.analysis = {
    methodId: detail.analyticsTechniqueId || "",
    mapping: detail.analyticsTechniqueMapping || { mapping: [] },
    params: detail.analyticsTechniqueParams || [],
  };
  configuration.visualization = {
    ...configuration.visualization,
    libraryId: detail.visualizationLibraryId || "",
    typeId: detail.visualizationTypeId || "",
    mapping: detail.visualizationMapping || { mapping: [] },
    params: detail.visualizationParams || {},
  };
  return configuration;
}
