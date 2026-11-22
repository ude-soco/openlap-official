import { currentAnalysisSource, isIdentityAnalysisField, withAnalysisInputDefaults } from "../components/analysis/utils/analysis-data.js";

// The persisted authoring document is deliberately independent of React state,
// catalogs, analyzed rows and generated chart code.
const object = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const list = (value) => Array.isArray(value) ? value : [];
const text = (value) => typeof value === "string" ? value : "";
const pick = (value, keys) => Object.fromEntries(keys.filter((key) =>
  Object.prototype.hasOwnProperty.call(object(value), key)).map((key) => [key, value[key]]));
const reference = (value) => ({ id: text(value?.id), name: text(value?.name) });
const port = (value) => pick(value, ["id", "type", "name", "title", "required", "description"]);
const mapping = (value) => ({ mapping: list(value?.mapping).map((entry) => ({
  inputPort: port(entry.inputPort), outputPort: port(entry.outputPort),
})) });

export function emptyBasicState(now = new Date()) {
  const from = new Date(now);
  from.setFullYear(from.getFullYear() - 1);
  return {
    indicator: { indicatorName: "", type: "BASIC" },
    dataset: { myLRSList: [], selectedLRSList: [] },
    filters: { selectedUserFilter: "ONLY_ME", selectedTime: { from: from.toISOString(), until: now.toISOString() },
      activityTypesList: [], selectedActivities: [] },
    analysis: { analyticsMethodList: [], inputs: [], params: [],
      selectedAnalyticsMethod: { method: { id: "", name: "" }, mapping: { mapping: [] } }, analyzedData: {} },
    visualization: { libraryList: [], selectedLibrary: { id: "", name: "" }, typeList: [],
      selectedType: { id: "", name: "", chartInputs: [] }, inputs: [], params: { height: 500, width: 500 },
      mapping: { mapping: [] }, previewData: { displayCode: [], scriptData: {} } },
    lockedStep: Object.fromEntries(["dataset", "filters", "analysis", "visualization", "finalize"].map((key, index) =>
      [key, { locked: index !== 0, openPanel: index === 0, step: String(index + 1) }])),
  };
}

export function serializeBasicDraft(state) {
  const value = object(state);
  return {
    schemaVersion: 1, type: "BASIC",
    indicator: { indicatorName: text(value.indicator?.indicatorName), type: "BASIC" },
    dataset: { selectedLRSList: list(value.dataset?.selectedLRSList).map((entry) =>
      pick(entry, ["id", "lrsId", "uniqueIdentifier", "lrsTitle"])) },
    filters: {
      selectedUserFilter: text(value.filters?.selectedUserFilter) || "ONLY_ME",
      selectedTime: pick(value.filters?.selectedTime, ["from", "until"]),
      selectedActivities: list(value.filters?.selectedActivities).map((entry) => ({
        id: text(entry.id), selectedActivityType: reference(entry.selectedActivityType),
        selectedActionList: list(entry.selectedActionList).map(reference),
        selectedActivityList: list(entry.selectedActivityList).map((item) => pick(item, ["id", "name", "queryId"])),
      })),
    },
    analysis: {
      selectedAnalyticsMethod: { method: reference(value.analysis?.selectedAnalyticsMethod?.method),
        mapping: mapping(value.analysis?.selectedAnalyticsMethod?.mapping) },
      params: list(value.analysis?.params).map((param) => pick(param, ["id", "value"])),
    },
    visualization: { selectedLibrary: reference(value.visualization?.selectedLibrary),
      selectedType: reference(value.visualization?.selectedType), mapping: mapping(value.visualization?.mapping),
      params: { ...object(value.visualization?.params) } },
    lockedStep: Object.fromEntries(Object.entries(object(value.lockedStep)).filter(([key]) =>
      ["dataset", "filters", "analysis", "visualization", "finalize"].includes(key)).map(([key, step]) =>
      [key, { locked: Boolean(step?.locked), openPanel: Boolean(step?.openPanel), step: text(step?.step) }])),
  };
}

export function readBasicDraft(raw) {
  try {
    if (typeof raw === "string" && raw.length > 1048576) return null;
    const value = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!value || (value.schemaVersion != null && value.schemaVersion !== 1) ||
        (value.type || value.indicator?.type) !== "BASIC") return null;
    const canonical = value.schemaVersion === 1 && value.type === "BASIC";
    if (!canonical && (!value.indicator || !value.dataset || !value.filters || !value.analysis || !value.visualization)) return null;
    return serializeBasicDraft(value);
  } catch { return null; }
}

export function restoreBasicState(raw) {
  const defaults = emptyBasicState();
  const saved = readBasicDraft(raw);
  if (!saved) return defaults;
  const method = saved.analysis.selectedAnalyticsMethod;
  const allowedMappings = method.mapping.mapping.filter((entry) => !isIdentityAnalysisField(entry.outputPort.id));
  const removedIdentity = allowedMappings.length !== method.mapping.mapping.length;
  const lockedStep = { ...defaults.lockedStep, ...saved.lockedStep };
  if (removedIdentity) {
    lockedStep.analysis = { ...lockedStep.analysis, openPanel: !lockedStep.analysis.locked };
    lockedStep.visualization = { ...lockedStep.visualization, locked: true, openPanel: false };
    lockedStep.finalize = { ...lockedStep.finalize, locked: true, openPanel: false };
  }
  return {
    ...(removedIdentity && { inputWarning: "Learner identity fields were removed from this draft. Review Method inputs before saving." }),
    indicator: { ...defaults.indicator, ...saved.indicator },
    dataset: { ...defaults.dataset, ...saved.dataset },
    filters: { ...defaults.filters, ...saved.filters, selectedTime: { ...defaults.filters.selectedTime, ...saved.filters.selectedTime },
      selectedActivities: saved.filters.selectedActivities.map((entry) => ({
        ...entry, actionList: [], activityList: [],
      })) },
    analysis: { ...defaults.analysis, ...saved.analysis,
      selectedAnalyticsMethod: { ...method, mapping: { mapping: allowedMappings } } },
    visualization: { ...defaults.visualization, ...saved.visualization,
      selectedType: { ...defaults.visualization.selectedType, ...saved.visualization.selectedType } },
    lockedStep,
  };
}

export const basicDraftMeaningful = (configuration) => Boolean(
  configuration.indicator?.indicatorName?.trim() || configuration.dataset?.selectedLRSList?.length ||
  configuration.filters?.selectedActivities?.length || configuration.analysis?.selectedAnalyticsMethod?.method?.id ||
  configuration.visualization?.selectedLibrary?.id,
);

export async function refreshBasicReferences(api, raw, { adaptation = false } = {}) {
  const state = restoreBasicState(raw);
  const warnings = [];
  if (adaptation && !["ONLY_ME", "EXCLUDE_ME", "INCLUDE_ME"].includes(state.filters.selectedUserFilter))
    state.filters.selectedUserFilter = "ONLY_ME";
  const data = async (method, path, body) => (await api[method](path, ...(body === undefined ? [] : [body]))).data.data;
  const attempt = async (label, operation) => {
    try { return await operation(); }
    catch { warnings.push(`Could not refresh ${label}. Your selections are preserved.`); return null; }
  };
  const lrsKey = (entry) => `${entry.lrsId}:${entry.uniqueIdentifier}`;
  const [stores, methods, libraries] = await Promise.all([
    attempt("Learning Record Stores", () => data("get", "v1/users/my/lrs")),
    attempt("analytics methods", () => data("get", "v1/analytics/methods")),
    attempt("visualization libraries", () => data("get", "v1/visualizations/libraries")),
  ]);
  state.dataset.myLRSList = stores || [];
  state.analysis.analyticsMethodList = methods || [];
  state.visualization.libraryList = libraries || [];
  if (stores) state.dataset.selectedLRSList = state.dataset.selectedLRSList.map((old) => {
    const current = stores.find((entry) => lrsKey(entry) === lrsKey(old));
    if (!current) warnings.push(`The Learning Record Store “${old.lrsTitle || old.lrsId}” is no longer available. Choose an available source.`);
    return current || (adaptation ? null : old);
  }).filter(Boolean);
  const selectedMethod = state.analysis.selectedAnalyticsMethod.method;
  if (selectedMethod.id) {
    const current = methods?.find((entry) => entry.id === selectedMethod.id);
    if (methods && !current) warnings.push(`The analytics method “${selectedMethod.name || selectedMethod.id}” is no longer available.`);
    if (adaptation && methods && !current) {
      state.analysis.selectedAnalyticsMethod = { method: { id: "", name: "" }, mapping: { mapping: [] } };
      state.analysis.params = [];
    }
    if (current) state.analysis.selectedAnalyticsMethod.method = current;
    const contract = (!adaptation || current) && await attempt("the selected method's inputs and parameters", () =>
      data("get", `v1/analytics/methods/input-params/${encodeURIComponent(selectedMethod.id)}`));
    if (contract) {
      if (adaptation) state.analysis.selectedAnalyticsMethod.mapping.mapping = state.analysis.selectedAnalyticsMethod.mapping.mapping.flatMap((entry) => {
        const input = (contract.inputs || []).find((item) => item.id === entry.inputPort.id);
        const output = currentAnalysisSource(input || {}, entry.outputPort);
        return input && output && input.type === output.type ? [{ inputPort: port(input), outputPort: port(output) }] : [];
      });
      state.analysis.inputs = (contract.inputs || []).map((input) => ({ ...input,
        selectedInput: state.analysis.selectedAnalyticsMethod.mapping.mapping.find((entry) => entry.inputPort.id === input.id)?.outputPort,
      }));
      state.analysis = withAnalysisInputDefaults(state.analysis);
      const savedParams = new Map(state.analysis.params.map((param) => [param.id, param]));
      state.analysis.params = (contract.params || []).map((param) => ({ ...param,
        value: savedParams.has(param.id) ? savedParams.get(param.id).value : param.defaultValue,
      }));
      for (const [id, saved] of savedParams) if (!(contract.params || []).some((param) => param.id === id)) {
        warnings.push(`The saved parameter “${id}” is no longer advertised by this method. Review the method selection.`);
        if (!adaptation) state.analysis.params.push({ ...saved, name: id, title: id, type: "Textbox", dataType: "STRING" });
      }
    }
  }
  const library = state.visualization.selectedLibrary;
  if (library.id) {
    const current = libraries?.find((entry) => entry.id === library.id);
    if (libraries && !current) warnings.push(`The visualization library “${library.name || library.id}” is no longer available.`);
    if (adaptation && libraries && !current) {
      state.visualization.selectedLibrary = { id: "", name: "" };
      state.visualization.selectedType = { id: "", name: "", chartInputs: [] };
      state.visualization.mapping = { mapping: [] };
    }
    if (current) state.visualization.selectedLibrary = current;
    const types = (!adaptation || current) && await attempt("the selected library's charts", () =>
      data("get", `v1/visualizations/libraries/${encodeURIComponent(library.id)}/types`));
    state.visualization.typeList = types || [];
    const typeId = state.visualization.selectedType.id;
    if (typeId) {
      const currentType = types?.find((entry) => entry.id === typeId);
      if (types && !currentType) warnings.push("The saved chart type is no longer available. Choose another chart.");
      if (adaptation && types && !currentType) {
        state.visualization.selectedType = { id: "", name: "", chartInputs: [] };
        state.visualization.mapping = { mapping: [] };
      }
      if (currentType) {
        if (adaptation) state.visualization.mapping.mapping = state.visualization.mapping.mapping.flatMap((entry) => {
          const input = (currentType.chartInputs || []).find((item) => item.id === entry.inputPort.id);
          return input && input.type === entry.outputPort.type ? [{ inputPort: port(input), outputPort: entry.outputPort }] : [];
        });
        state.visualization.selectedType = currentType;
        state.visualization.inputs = (currentType.chartInputs || []).map((input) => ({ ...input,
          selectedInput: state.visualization.mapping.mapping.find((entry) => entry.inputPort.id === input.id)?.outputPort,
        }));
      }
    }
  }
  if (state.dataset.selectedLRSList.length) {
    const lrsStores = state.dataset.selectedLRSList.map((entry) => pick(entry, ["lrsId", "uniqueIdentifier"]));
    state.filters.activityTypesList = await attempt("activity types", () => data("post", "v1/statements/activity-types", { lrsStores })) || [];
    state.filters.selectedActivities = await Promise.all(state.filters.selectedActivities.map(async (activity) => {
      if (!activity.selectedActivityType.id) return activity;
      const currentType = state.filters.activityTypesList.find((entry) => entry.id === activity.selectedActivityType.id);
      if (adaptation && !currentType) return { ...activity, selectedActivityType: { id: "", name: "" }, selectedActionList: [], selectedActivityList: [], actionList: [], activityList: [] };
      const activityType = activity.selectedActivityType.id;
      const actionList = await attempt("actions", () => data("post", "v1/statements/actions", { lrsStores, activityTypes: [activityType] }));
      const selectedActionList = adaptation ? activity.selectedActionList.filter((old) => (actionList || []).some((entry) => entry.id === old.id)) : activity.selectedActionList;
      let activityList = [];
      if (selectedActionList.length) activityList = await attempt("activities", () => data("post", "v1/statements/activities", {
        lrsStores, activityTypes: [activityType], actionOnActivities: selectedActionList.map((entry) => entry.id),
      })) || [];
      return { ...activity, selectedActionList,
        selectedActivityList: adaptation ? activity.selectedActivityList.filter((old) => activityList.some((entry) => entry.id === old.id && entry.queryId === old.queryId)) : activity.selectedActivityList,
        actionList: actionList || [], activityList };
    }));
  }
  if (adaptation && !state.dataset.selectedLRSList.length) {
    state.filters.selectedActivities = state.filters.selectedActivities.map((entry) => ({ ...entry,
      selectedActivityType: { id: "", name: "" }, selectedActionList: [], selectedActivityList: [], actionList: [], activityList: [] }));
  }
  return { state, warnings };
}
