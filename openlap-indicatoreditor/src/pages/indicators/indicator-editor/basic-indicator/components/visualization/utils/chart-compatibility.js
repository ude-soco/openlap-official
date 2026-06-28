// Presentation-only compatibility derivation for the Visualization step.
//
// IMPORTANT: this does NOT change the chart recommendation logic. It reuses the
// exact same inputs the previous `isChartRecommended` used — the count of a
// chart's *required* input types vs the count of types available in the
// analysed data — and exposes a richer, but equivalent, result:
//
//   - "recommended"  → has required types and ALL are satisfied
//                      (identical to the old isChartRecommended === true)
//   - "compatible"   → the chart declares no required types (nothing to fail)
//   - "needs-data"   → has required types but some are not satisfied
//
// The first case is byte-for-byte the previous recommendation; the other two
// only split the old "false" result into a clearer two-way for grouping.

export const formatTypeName = (type) => {
  if (type === "Text") return "Categorical";
  if (type === "Numeric") return "Numerical";
  return type;
};

const countRequiredTypes = (chartInputs = []) => {
  const counts = {};
  for (const input of chartInputs) {
    if (!input.required) continue;
    counts[input.type] = (counts[input.type] || 0) + 1;
  }
  return counts;
};

const countAvailableTypes = (analyzedData = {}) => {
  const counts = {};
  for (const key in analyzedData) {
    const type = analyzedData[key]?.configurationData?.type;
    if (!type) continue;
    counts[type] = (counts[type] || 0) + 1;
  }
  return counts;
};

/**
 * @returns {{ status: "recommended"|"compatible"|"needs-data",
 *   conditions: {type,label,required,available,satisfied}[], hasRequired: boolean }}
 */
export const getChartCompatibility = (chartType, analyzedData) => {
  const requiredTypeCount = countRequiredTypes(chartType?.chartInputs);
  const availableTypeCount = countAvailableTypes(analyzedData);
  const hasRequired = Object.keys(requiredTypeCount).length > 0;

  const conditions = Object.entries(requiredTypeCount).map(
    ([type, required]) => {
      const available = availableTypeCount[type] || 0;
      return {
        type,
        label: formatTypeName(type),
        required,
        available,
        satisfied: available >= required,
      };
    }
  );

  const allSatisfied = conditions.every((c) => c.satisfied);

  let status;
  if (hasRequired && allSatisfied) status = "recommended";
  else if (!hasRequired) status = "compatible";
  else status = "needs-data";

  return { status, conditions, hasRequired };
};

/** Buckets a typeList into recommended / compatible / needs-data (each entry
 *  keeps its computed compatibility so callers don't recompute). */
export const categorizeCharts = (typeList = [], analyzedData = {}) => {
  const groups = { recommended: [], compatible: [], needsData: [] };
  typeList.forEach((type) => {
    const compat = getChartCompatibility(type, analyzedData);
    const entry = { type, compat };
    if (compat.status === "recommended") groups.recommended.push(entry);
    else if (compat.status === "compatible") groups.compatible.push(entry);
    else groups.needsData.push(entry);
  });
  return groups;
};

/** Short "Requires 1 Categorical column" hint for needs-data cards. */
export const buildRequirementText = (conditions = []) => {
  const missing = conditions.filter((c) => !c.satisfied);
  if (missing.length === 0) return "";
  const parts = missing.map(
    (c) => `${c.required} ${c.label} column${c.required === 1 ? "" : "s"}`
  );
  return `Requires ${parts.join(" + ")}`;
};
