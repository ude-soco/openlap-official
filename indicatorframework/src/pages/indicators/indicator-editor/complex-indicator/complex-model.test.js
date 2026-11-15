import test from "node:test";
import assert from "node:assert/strict";
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
