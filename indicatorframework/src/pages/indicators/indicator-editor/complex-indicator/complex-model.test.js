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
  readComplexConfiguration,
  recoveryKey,
  saveRequest,
  sourceSelection,
  withMapping,
} from "./complex-model.js";

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
