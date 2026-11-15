import test from "node:test";
import assert from "node:assert/strict";
import {
  customizationVisible,
  getCustomizationErrors,
  getCustomizationFields,
  getMappedCategoryValues,
  getVisualizationDefaults,
  getVisualizationDescription,
  getVisualizationDescriptor,
} from "./visualization-descriptor.js";

const descriptor = {
  schemaVersion: 1,
  id: "example-bar",
  description: "Compare measurements across categories.",
  inputRoles: { category: "labels" },
  customizations: [
    { id: "chartTitle", label: "Chart title", type: "text", group: "elements", defaultValue: "Example" },
    { id: "showLabels", label: "Show values", type: "boolean", group: "elements", defaultValue: true },
    { id: "fill", label: "Bar color", type: "color", group: "styles", defaultValue: "#1976d2" },
    { id: "limit", label: "Number of values", type: "number", group: "filters", min: 0, max: 20, step: 2, defaultValue: 10 },
    { id: "direction", label: "Direction", type: "select", group: "styles", defaultValue: "horizontal", options: [
      { value: "horizontal", label: "Horizontal" }, { value: "vertical", label: "Vertical" },
    ] },
  ],
};
const chart = { visualizationDescriptor: descriptor, chartInputs: [{ id: "firstText", type: "Text" }, { id: "labels", type: "Text" }] };

test("descriptor defaults replace legacy choices while preserving saved false, zero and blank values", () => {
  const defaults = getVisualizationDefaults(chart, { legacy: true });
  assert.equal(defaults.legacy, undefined);
  assert.equal(defaults.chartTitle, "Example");
  assert.deepEqual(getVisualizationDefaults(chart, {}, { chartTitle: "", showLabels: false, limit: 0 }), {
    ...defaults, chartTitle: "", showLabels: false, limit: 0,
  });
  assert.deepEqual(getVisualizationDefaults({}, { legacy: true, height: 500 }, { height: 320 }), { legacy: true, height: 320 });
});

test("only supported manifest versions enable descriptor controls", () => {
  assert.equal(getVisualizationDescriptor(chart), descriptor);
  assert.equal(getVisualizationDescriptor({ visualizationDescriptor: { ...descriptor, schemaVersion: 2 } }), null);
  assert.equal(getVisualizationDescriptor({ visualizationDescriptor: { schemaVersion: 1 } }), null);
  assert.equal(getVisualizationDescriptor({}), null);
});

test("unsupported, repeated and prototype-like fields cannot construct a customization control", () => {
  const fields = getCustomizationFields({ customizations: [
    descriptor.customizations[0], descriptor.customizations[0],
    { id: "constructor", type: "text", group: "elements" },
    { id: "__proto__", type: "text", group: "elements" },
    { id: "unsafe", type: "react", group: "elements" },
    { id: "unknownGroup", type: "text", group: "script" },
  ] });
  assert.deepEqual(fields.map((field) => field.id), ["chartTitle"]);
});

test("valid defaults and each documented customization type satisfy validation", () => {
  const defaults = getVisualizationDefaults(chart);
  assert.deepEqual(getCustomizationErrors(descriptor, defaults), {});
  assert.deepEqual(getCustomizationErrors(descriptor, { ...defaults, chartTitle: "", showLabels: false, limit: 0 }), {});
});

test("invalid numbers, ranges, steps, choices and colors receive field-specific feedback", () => {
  const values = getVisualizationDefaults(chart);
  for (const limit of ["", " ", NaN, Infinity, "not a number", -2, 22, 3]) {
    assert.ok(getCustomizationErrors(descriptor, { ...values, limit }).limit);
  }
  const errors = getCustomizationErrors(descriptor, { ...values, fill: "red", showLabels: "true", direction: "diagonal", chartTitle: 42 });
  assert.deepEqual(Object.keys(errors).sort(), ["chartTitle", "direction", "fill", "showLabels"]);
});

test("conditional controls use typed equality and hidden controls do not block preview", () => {
  const conditional = { id: "labelColor", type: "color", group: "styles",
    visibleWhen: { id: "showLabels", equals: true } };
  const contract = { customizations: [conditional] };
  assert.equal(customizationVisible(conditional, { showLabels: false }), false);
  assert.equal(customizationVisible(conditional, { showLabels: "true" }), false);
  assert.deepEqual(getCustomizationErrors(contract, { showLabels: false, labelColor: "invalid" }), {});
  assert.ok(getCustomizationErrors(contract, { showLabels: true, labelColor: "invalid" }).labelColor);
});

test("category data follows its declared input role and actual mapping", () => {
  const dataset = { columns: {
    incidental: { configurationData: { type: "Text" }, data: ["not the category"] },
    renamed_column: { configurationData: { type: "Text" }, data: ["Selected category"] },
  } };
  const mapping = { mapping: [{ inputPort: { id: "labels" }, outputPort: { id: "renamed_column" } }] };
  assert.deepEqual(getMappedCategoryValues(chart, mapping, dataset), ["Selected category"]);
  assert.deepEqual(getMappedCategoryValues(chart, { mapping: [] }, dataset), []);
  assert.deepEqual(getMappedCategoryValues({}, {}, dataset.columns), ["not the category"]);
});

test("plugin description contributes guidance without discarding legacy optional guidance", () => {
  const legacy = { summary: "Generic chart", bestFor: "Exploration" };
  assert.deepEqual(getVisualizationDescription(chart, legacy), { ...legacy, summary: descriptor.description });
  assert.equal(getVisualizationDescription({}, legacy), legacy);
});
