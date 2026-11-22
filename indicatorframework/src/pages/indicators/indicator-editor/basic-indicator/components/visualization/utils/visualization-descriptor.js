const FIELD_TYPES = new Set(["text", "number", "boolean", "select", "color", "categoryFilter", "seriesColors"]);
const DATA_ROLES = new Set(["category", "series"]);
const MAX_DATA_CUSTOMIZATIONS = 2_000;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
export const CUSTOMIZATION_GROUPS = ["elements", "styles", "filters"];
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const safeId = (id) => typeof id === "string" &&
  /^[A-Za-z][A-Za-z0-9_.-]{0,99}$/.test(id) &&
  !["constructor", "prototype", "__proto__"].includes(id);
const validDataLabel = (value) => typeof value === "string" &&
  value.length <= 10_000 && !value.includes("\0") && Boolean(value.trim());

export function uniqueCustomizationLabels(values = []) {
  return Array.isArray(values) ? [...new Set(values.filter(validDataLabel))] : [];
}

function validLabeledChoices(value, labelOf) {
  if (!Array.isArray(value) || value.length > MAX_DATA_CUSTOMIZATIONS) return false;
  const labels = value.map(labelOf);
  return labels.every(validDataLabel) && new Set(labels).size === labels.length;
}

/** Only the versioned, declarative contract is used to construct native controls. */
export function getVisualizationDescriptor(chart) {
  const descriptor = chart?.visualizationDescriptor;
  return descriptor?.schemaVersion === 1 && Array.isArray(descriptor.customizations)
    ? descriptor : null;
}

export function getCustomizationFields(descriptor) {
  const seen = new Set();
  return (descriptor?.customizations || []).filter((field) => {
    if (!safeId(field?.id) || seen.has(field.id) || !FIELD_TYPES.has(field.type) ||
        !CUSTOMIZATION_GROUPS.includes(field.group) ||
        (field.type === "seriesColors" && !DATA_ROLES.has(field.source))) return false;
    seen.add(field.id);
    return true;
  });
}

/** Defaults fill missing fields only; false, zero and an explicitly blank edit survive. */
export function getVisualizationDefaults(chart, legacyDefaults = {}, saved = {}) {
  const descriptor = getVisualizationDescriptor(chart);
  if (!descriptor) return { ...legacyDefaults, ...saved };
  const defaults = Object.fromEntries(getCustomizationFields(descriptor)
    .filter((field) => own(field, "defaultValue"))
    .map((field) => [field.id, field.defaultValue]));
  return { ...defaults, ...saved };
}

export function customizationVisible(field, values) {
  const condition = field.visibleWhen;
  return !condition || (safeId(condition.id) && values[condition.id] === condition.equals);
}

export function getCustomizationErrors(descriptor, values = {}) {
  return Object.fromEntries(getCustomizationFields(descriptor).flatMap((field) => {
    if (!customizationVisible(field, values)) return [];
    const value = own(values, field.id) ? values[field.id] : field.defaultValue;
    let error = "";
    if (value == null) return [];
    if (field.type === "number") {
      const number = typeof value === "number" || (typeof value === "string" && value.trim()) ? Number(value) : NaN;
      if (!Number.isFinite(number)) error = "Enter a valid number.";
      else if (field.min != null && number < field.min) error = `Use ${field.min} or greater.`;
      else if (field.max != null && number > field.max) error = `Use ${field.max} or less.`;
      else if (field.step != null && field.step > 0) {
        const quotient = (number - (field.min ?? 0)) / field.step;
        if (Math.abs(quotient - Math.round(quotient)) > 1e-8) error = `Use increments of ${field.step}.`;
      }
    } else if (field.type === "boolean" && typeof value !== "boolean") error = "Choose on or off.";
    else if (field.type === "select" && !(field.options || []).some((option) => option.value === value))
      error = "Choose an available option.";
    else if (field.type === "color" && !HEX_COLOR.test(String(value)))
      error = "Use a six-digit hex color, for example #1976d2.";
    else if (field.type === "text" && typeof value !== "string") error = "Enter text.";
    else if (field.type === "categoryFilter" && !validLabeledChoices(value, (label) => label))
      error = "Hide up to 2,000 distinct categories.";
    else if (field.type === "seriesColors" && !validLabeledChoices(value, (entry) =>
      entry && own(entry, "key") && own(entry, "color") && Object.keys(entry).length === 2 &&
      typeof entry.color === "string" && HEX_COLOR.test(entry.color) ? entry.key : null))
      error = "Choose up to 2,000 distinct labels with six-digit hex colors.";
    return error ? [[field.id, error]] : [];
  }));
}

/** Category metadata refers to an input port, never a dataset's historical field name. */
export function getMappedCustomizationValues(chart, mapping, dataset, role) {
  const descriptor = getVisualizationDescriptor(chart);
  const columns = dataset?.columns || dataset || {};
  const inputId = descriptor?.inputRoles?.[role] ||
    (role === "category" ? chart?.chartInputs?.find((input) => input.type === "Text")?.id : null);
  const columnId = mapping?.mapping?.find((entry) => entry.inputPort?.id === inputId)?.outputPort?.id;
  const column = columnId ? columns[columnId] : null;
  return Array.isArray(column?.data) ? column.data
    : !descriptor && role === "category"
      ? Object.values(columns).find((entry) => entry.configurationData?.type === "Text")?.data || [] : [];
}

export function getMappedCategoryValues(chart, mapping, dataset) {
  return getMappedCustomizationValues(chart, mapping, dataset, "category");
}

export function getMappedSeriesName(chart, mapping, dataset) {
  const descriptor = getVisualizationDescriptor(chart);
  if (descriptor?.customizationLayout !== "isc") return undefined;
  if (descriptor.id === "scatter") return "Observations";
  const input = chart?.chartInputs?.find(({ type }) => type === "Numeric");
  const output = mapping?.mapping?.find(({ inputPort }) => inputPort?.id === input?.id)?.outputPort;
  const column = (dataset?.columns || dataset || {})[output?.id];
  return column?.configurationData?.title || output?.title || output?.name;
}

export function getVisualizationDescription(chart, legacy = {}) {
  const descriptor = getVisualizationDescriptor(chart);
  return descriptor?.description ? { ...legacy, summary: descriptor.description } : legacy;
}

/** Icons are served from the approved artifact, never a URL supplied by plugin metadata. */
export function getVisualizationIconUrl(chart, apiBase = "/api/", documentUrl = "http://localhost/") {
  if (!chart?.id || !getVisualizationDescriptor(chart)?.iconAssetId) return "";
  try {
    const base = new URL(apiBase, documentUrl);
    if (!["http:", "https:"].includes(base.protocol)) return "";
    if (!base.pathname.endsWith("/")) base.pathname += "/";
    return new URL(`v1/code/visualizations/${encodeURIComponent(chart.id)}/icon`, base).href;
  } catch { return ""; }
}
