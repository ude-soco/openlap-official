import test from "node:test";
import assert from "node:assert/strict";
import { emptyBasicState, serializeBasicDraft } from "../basic-indicator/utils/basic-draft-model.js";
import {
  canSelectSource,
  compositionRequest,
  datasetRows,
  defaultMappings,
  fallbackConfiguration,
  mappingsReady,
  newComplexConfiguration,
  parametersReady,
  readComplexConfiguration,
  recoveryKey,
  saveRequest,
  sourceExecutionSelections,
  sourceSelection,
  toComplexDraftConfiguration,
  withMapping,
} from "./complex-model.js";

test("draft configuration keeps choices and refreshes method contract metadata on resume", () => {
  const configuration = newComplexConfiguration("MULTI_LEVEL");
  configuration.analysis.params = [{ id: "clusters", value: "3", title: "Clusters", required: true,
    possibleValues: "1,2,3", defaultValue: "2", description: "Installed plugin contract" }];
  configuration.analysis.analyzedData = { privateRows: [1, 2] };
  configuration.visualization.previewData = { html: "<script>legacy preview</script>" };
  configuration.sources = [{ id: "source", name: "Source", label: "Source", keyColumnId: "count", measureColumnIds: ["count"], filterSummary: "",
    analyticsMethod: { id: "method", name: "Method", cachedCatalog: true },
    outputs: [{ id: "count", type: "Numeric", title: "Count", cachedValues: [1, 2] }] }];
  configuration.analysis.mapping = { mapping: [{ inputPort: { id: "input", type: "Numeric", cache: "discard" },
    outputPort: { id: "count", type: "Numeric", privateRows: [1, 2] } }] };
  const draft = toComplexDraftConfiguration(configuration);
  assert.deepEqual(draft.analysis.params, [{ id: "clusters", value: "3" }]);
  assert.equal(draft.analysis.analyzedData, undefined);
  assert.equal(draft.visualization.previewData, undefined);
  assert.deepEqual(draft.sources[0].analyticsMethod, { id: "method", name: "Method" });
  assert.deepEqual(draft.sources[0].outputs, [{ id: "count", type: "Numeric", title: "Count" }]);
  assert.deepEqual(draft.analysis.mapping.mapping[0], { inputPort: { id: "input", type: "Numeric" }, outputPort: { id: "count", type: "Numeric" } });
  assert.deepEqual(JSON.parse(saveRequest(configuration).configuration), draft,
    "Completing an indicator uses the exact canonical configuration saved in its draft");
  assert.equal(configuration.analysis.params[0].title, "Clusters", "The live method controls keep their contract metadata");
});

const text = {
  id: "material",
  title: "Material",
  type: "Text",
  required: true,
};
const numeric = {
  id: "count",
  title: "Count",
  type: "Numeric",
  required: true,
};
const source = (id, method = "counts") => ({
  id,
  name: `Source ${id}`,
  analyticsMethod: { id: method, name: method },
  outputs: [text, numeric],
  available: true,
});

test("adaptation sources persist only bounded Basic choices and reject partial keysets", () => {
  const config = newComplexConfiguration("COMPOSITE");
  config.sources = [sourceSelection(source("source-1")), sourceSelection(source("source-2"))];
  const basic = emptyBasicState();
  basic.analysis.analyzedData = { privateRows: ["secret"] };
  config.sourceDrafts = { "source-1": serializeBasicDraft(basic), "source-2": serializeBasicDraft(basic) };
  const restored = toComplexDraftConfiguration(config);
  assert.equal(restored.sourceDrafts["source-1"].analysis.analyzedData, undefined);
  assert.deepEqual(readComplexConfiguration(restored, "COMPOSITE"), restored);
  delete config.sourceDrafts["source-2"];
  assert.equal(readComplexConfiguration(config, "COMPOSITE"), null);
  config.sources = [{ ...config.sources[0], id: "__proto__" }];
  config.sourceDrafts = JSON.parse('{"__proto__":{"schemaVersion":1,"type":"BASIC"}}');
  assert.equal(readComplexConfiguration(config, "COMPOSITE"), null);
});

test("source navigation preserves execution results while every data selection remains significant", () => {
  const original = serializeBasicDraft(emptyBasicState(new Date("2026-01-01T00:00:00Z")));
  const navigated = structuredClone(original);
  navigated.lockedStep.dataset.openPanel = false;
  navigated.lockedStep.filters.openPanel = true;
  assert.deepEqual(sourceExecutionSelections(navigated), sourceExecutionSelections(original),
    "Opening another source panel keeps the same execution selections");
  assert.equal(original.lockedStep.dataset.openPanel, true, "Comparison leaves the source draft unchanged");
  assert.equal(navigated.lockedStep.filters.openPanel, true, "Panel choices remain available for draft persistence");

  const changes = {
    LRS: (draft) => { draft.dataset.selectedLRSList = [{ lrsId: "different-lrs", uniqueIdentifier: "viewer" }]; },
    filters: (draft) => { draft.filters.selectedUserFilter = "INCLUDE_ME"; },
    timeframe: (draft) => { draft.filters.selectedTime.from = "2025-02-01T00:00:00Z"; },
    activities: (draft) => { draft.filters.selectedActivities = [{ selectedActivityType: { id: "material" }, selectedActionList: [{ id: "clicked" }] }]; },
    method: (draft) => { draft.analysis.selectedAnalyticsMethod.method.id = "other-method"; },
    mapping: (draft) => { draft.analysis.selectedAnalyticsMethod.mapping.mapping = [{ inputPort: { id: "input" }, outputPort: { id: "activity" } }]; },
    parameter: (draft) => { draft.analysis.params = [{ id: "count", value: "10" }]; },
    chart: (draft) => { draft.visualization.selectedType.id = "other-chart"; },
    customization: (draft) => { draft.visualization.params.width = 700; },
    futureSelection: (draft) => { draft.futureInput = { value: "new selection" }; },
  };
  for (const [name, change] of Object.entries(changes)) {
    const changed = structuredClone(navigated);
    change(changed);
    assert.notDeepEqual(sourceExecutionSelections(changed), sourceExecutionSelections(original),
      `Changing ${name} invalidates the previous execution selections`);
  }
});
const dataset = {
  columns: {
    key: { configurationData: { ...text, id: "key" }, data: ["a", "b"] },
    source_one__count: {
      configurationData: { ...numeric, id: "source_one__count" },
      data: [2.5, 0],
    },
    source_two__count: {
      configurationData: { ...numeric, id: "source_two__count" },
      data: [4.75, 9],
    },
  },
};

test("Composite enforces analytics method identity, not similar labels", () => {
  const selected = [source("one", "first-method")];
  assert.equal(
    canSelectSource("COMPOSITE", selected, source("two", "first-method"))
      .allowed,
    true,
  );
  const rejected = canSelectSource("COMPOSITE", selected, {
    ...source("two", "different-id"),
    analyticsMethod: { id: "different-id", name: "first-method" },
  });
  assert.equal(rejected.allowed, false);
  assert.match(rejected.reason, /Requires first-method/);
  assert.equal(
    canSelectSource("MULTI_LEVEL", selected, source("two", "different-id"))
      .allowed,
    true,
  );
});

test("selection prevents duplicate, unavailable and unbounded sources", () => {
  assert.equal(
    canSelectSource("MULTI_LEVEL", [source("one")], source("one")).allowed,
    false,
  );
  assert.equal(
    canSelectSource("COMPOSITE", [], { ...source("one"), available: false })
      .allowed,
    false,
  );
  assert.equal(
    canSelectSource(
      "MULTI_LEVEL",
      Array.from({ length: 10 }, (_, index) => source(String(index))),
      source("eleven"),
    ).allowed,
    false,
  );
});

test("recovery isolates account, indicator type and edit target", () => {
  const keys = new Set([
    recoveryKey("COMPOSITE", "first@example.test"),
    recoveryKey("MULTI_LEVEL", "first@example.test"),
    recoveryKey("COMPOSITE", "second@example.test"),
    recoveryKey("COMPOSITE", "first@example.test", "saved-id"),
  ]);
  assert.equal(keys.size, 4);
});

test("recovery rejects malformed, legacy, wrong-type and duplicate-source state", () => {
  for (const value of [
    "{",
    JSON.stringify({ indicator: { type: "COMPOSITE" } }),
    JSON.stringify(newComplexConfiguration("MULTI_LEVEL")),
  ]) {
    assert.equal(readComplexConfiguration(value, "COMPOSITE"), null);
  }
  const configuration = newComplexConfiguration("COMPOSITE");
  configuration.sources = [
    sourceSelection(source("one")),
    sourceSelection(source("one")),
  ];
  assert.equal(readComplexConfiguration(configuration, "COMPOSITE"), null);
  configuration.sources = [sourceSelection(source("one"))];
  configuration.analysis.params = "corrupted";
  assert.equal(readComplexConfiguration(configuration, "COMPOSITE"), null);
});

test("recovery keeps configuration but drops computed and rendered payloads", () => {
  const configuration = newComplexConfiguration("COMPOSITE");
  configuration.sources = [
    sourceSelection({
      ...source("one"),
      indicatorQuery: {
        duration: { from: "2026-01-01", until: "2026-11-01" },
        userQueryCondition: "INCLUDE_ME",
      },
      previewData: { scriptData: "not configuration" },
    }),
  ];
  const restored = readComplexConfiguration(
    {
      ...configuration,
      previewData: { scriptData: "not configuration" },
      mergedData: dataset,
    },
    "COMPOSITE",
  );
  assert.equal(restored.previewData, undefined);
  assert.equal(restored.mergedData, undefined);
  assert.equal(restored.sources[0].indicatorQuery, undefined);
  assert.equal(restored.sources[0].previewData, undefined);
  assert.match(restored.sources[0].filterSummary, /2026-01-01 to 2026-11-01/);
});

test("composition requests preserve each source key, measure selection and label", () => {
  const configuration = newComplexConfiguration("COMPOSITE");
  configuration.sources = [
    sourceSelection(source("one")),
    sourceSelection({
      ...source("two"),
      outputs: [{ ...text, id: "other_key" }, numeric],
    }),
  ];
  configuration.sources[1].label = "Student count";
  const request = compositionRequest(configuration);
  assert.equal(request.columnToMerge.id, "material");
  assert.equal(request.indicators[1].columnToMerge.id, "other_key");
  assert.deepEqual(request.indicators[1].measureColumnIds, ["count"]);
  assert.equal(request.indicators[1].label, "Student count");
  assert.equal(request.indicators[1].indicatorId, "two");
});

test("analysis suggestions use distinct derived numeric columns, not raw activity fields", () => {
  const inputs = [
    { ...numeric, id: "attribute_1" },
    { ...numeric, id: "attribute_2" },
  ];
  const mapping = defaultMappings(inputs, dataset);
  assert.deepEqual(
    mapping.mapping.map((item) => item.outputPort.id),
    ["source_one__count", "source_two__count"],
  );
  assert.equal(mappingsReady(inputs, mapping, dataset), true);
  const removedColumn = {
    columns: {
      key: dataset.columns.key,
      source_one__count: dataset.columns.source_one__count,
    },
  };
  assert.equal(
    mappingsReady(inputs, mapping, removedColumn),
    false,
    "Removed source columns invalidate mappings",
  );
  assert.equal(datasetRows(dataset), 2);
});

test("mapping edits preserve other inputs and support clearing optional mappings", () => {
  const inputs = [
    { ...numeric, id: "first" },
    { ...numeric, id: "second" },
  ];
  const original = defaultMappings(inputs, dataset);
  const edited = withMapping(
    original,
    inputs[0],
    dataset.columns.source_two__count.configurationData,
  );
  assert.equal(edited.mapping.length, 2);
  assert.equal(
    original.mapping[0].outputPort.id,
    "source_one__count",
    "Original mapping is immutable",
  );
  assert.equal(withMapping(edited, inputs[0], undefined).mapping.length, 1);
});

test("parameter readiness uses displayed defaults and permits optional blank values", () => {
  assert.equal(parametersReady(), true);
  assert.equal(parametersReady([
    { required: true, defaultValue: "3", dataType: "INTEGER" },
    { required: false, value: "" },
    { required: false, value: "   ", dataType: "DOUBLE" },
  ]), true);
  for (const value of ["", "   ", null, undefined]) {
    assert.equal(parametersReady([{ required: true, value }]), false);
  }
  assert.equal(parametersReady([
    { required: true, value: "", defaultValue: "3", dataType: "INTEGER" },
  ]), false, "An explicitly cleared field does not reuse its default");
  assert.equal(parametersReady([
    { required: true, value: null, defaultValue: "3", dataType: "INTEGER" },
  ]), true);
});

test("numeric parameter readiness rejects non-finite and fractional integer inputs", () => {
  for (const dataType of ["INTEGER", "DOUBLE", "FLOAT"]) {
    for (const value of ["not a number", "Infinity", NaN, Infinity, -Infinity, {}]) {
      assert.equal(parametersReady([{ dataType, value }]), false);
    }
    for (const value of [0, "0", "-2", "3e2"]) {
      assert.equal(parametersReady([{ dataType, value }]), true);
    }
  }
  assert.equal(parametersReady([{ dataType: "INTEGER", value: "2.5" }]), false);
  assert.equal(parametersReady([{ dataType: "DOUBLE", value: "2.5" }]), true);
  assert.equal(parametersReady([{ dataType: "FLOAT", value: "-0.25" }]), true);
});

test("choice parameter readiness requires one of the advertised options", () => {
  const choice = { type: "Choice", required: true, possibleValues: "All items,Unique items" };
  assert.equal(parametersReady([{ ...choice, defaultValue: "All items" }]), true);
  assert.equal(parametersReady([{ ...choice, value: "Unique items" }]), true);
  assert.equal(parametersReady([{ ...choice, value: "Unsupported option" }]), false);
  assert.equal(parametersReady([{ ...choice, value: "" }]), false);
  assert.equal(parametersReady([{ ...choice, required: false, value: "" }]), true);
});

test("saved payload includes canonical type/configuration and real analysis references", () => {
  const configuration = newComplexConfiguration("MULTI_LEVEL");
  configuration.name = "  Shared-material clusters  ";
  configuration.sources = [
    sourceSelection(source("one")),
    sourceSelection(source("two")),
  ];
  configuration.analysis.methodId = "kmeans";
  configuration.analysis.mapping = defaultMappings(
    [
      { ...numeric, id: "attribute_1" },
      { ...numeric, id: "attribute_2" },
    ],
    dataset,
  );
  configuration.analysis.params = [{ id: "cluster_count", value: "3" }];
  configuration.visualization.libraryId = "c3";
  configuration.visualization.typeId = "scatter";
  const payload = saveRequest(configuration);
  assert.equal(payload.indicatorType, "MULTI_LEVEL");
  assert.equal(payload.name, "Shared-material clusters");
  assert.equal(payload.analyticsTechniqueId, "kmeans");
  assert.equal(payload.analyticsTechniqueMapping.mapping.length, 2);
  assert.equal(JSON.parse(payload.configuration).schemaVersion, 1);
  assert.equal(
    readComplexConfiguration(payload.configuration, "MULTI_LEVEL").sources
      .length,
    2,
  );
});

test("direct editing can reconstruct a legacy complex definition only with complete sources", () => {
  const detail = {
    name: "Legacy",
    sourceIndicators: [
      { indicatorId: "one", columnToMerge: text },
      { indicatorId: "two", columnToMerge: text },
    ],
    visualizationLibraryId: "c3",
    visualizationTypeId: "bar",
  };
  assert.equal(
    fallbackConfiguration(detail, "COMPOSITE", [source("one")]),
    null,
  );
  const restored = fallbackConfiguration(detail, "COMPOSITE", [
    source("one"),
    source("two"),
  ]);
  assert.equal(restored.name, "Legacy");
  assert.equal(restored.sources[1].keyColumnId, "material");
  assert.equal(restored.visualization.typeId, "bar");
});
