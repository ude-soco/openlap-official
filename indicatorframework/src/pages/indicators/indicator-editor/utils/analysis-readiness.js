// Use the displayed parameter value, including the plugin's default, before
// requesting an analysis. Plugin-specific constraints remain server validated.
export function parametersReady(params = []) {
  return params.every((param) => {
    const value = param.value ?? param.defaultValue;
    const blank = value == null ||
      (typeof value === "string" && !value.trim());
    if (blank) return !param.required;
    if (param.type === "Choice" &&
      !String(param.possibleValues || "").split(",").includes(String(value))) {
      return false;
    }
    if (["INTEGER", "DOUBLE", "FLOAT"].includes(param.dataType)) {
      if (!["string", "number"].includes(typeof value)) return false;
      const numeric = Number(value);
      return Number.isFinite(numeric) &&
        (param.dataType !== "INTEGER" || Number.isInteger(numeric));
    }
    return true;
  });
}

export function basicAnalysisReady(dataset, filters, analysis) {
  const inputs = analysis?.inputs || [];
  const mapping = analysis?.selectedAnalyticsMethod?.mapping?.mapping || [];
  const activities = filters?.selectedActivities || [];
  const from = Date.parse(filters?.selectedTime?.from);
  const until = Date.parse(filters?.selectedTime?.until);
  if (!analysis?.selectedAnalyticsMethod?.method?.id || !inputs.length ||
      !mapping.length || !dataset?.selectedLRSList?.length ||
      !activities.length || !Number.isFinite(from) ||
      !Number.isFinite(until) || from > until) return false;

  const validMapping = (entry, input) => Boolean(
    input && entry?.outputPort?.id && entry.outputPort.type === input.type,
  );
  return activities.every((activity) =>
    activity.selectedActivityType?.id && activity.selectedActivityList?.length > 0,
  ) && mapping.every((entry) => validMapping(
    entry, inputs.find((input) => input.id === entry.inputPort?.id),
  )) && inputs.filter((input) => input.required).every((input) =>
    validMapping(mapping.find((entry) => entry.inputPort?.id === input.id), input),
  ) && parametersReady(analysis.params);
}
