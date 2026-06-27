// Single source of truth for Step 1 (Specify Requirements) validation.
//
// Mirrors the original `handleCheckDisabled` conditions EXACTLY so the Next
// button, the "what's missing" alert, and any completion check always agree.
// Pure functions over the `requirements` slice — no state, no side effects.
//
// NOTE: matches the Next/handleCheckDisabled rule, where an EMPTY data array is
// considered complete (`.some` over [] is false). This intentionally differs
// from isc-selectors.isRequirementsComplete (which also requires data.length>0
// for the stepper's "completed" badge); that selector is left untouched so the
// stepper behaves exactly as before.

const isGoalComplete = (requirements) =>
  requirements?.goalType?.verb !== "" && requirements?.goal !== "";

const isQuestionComplete = (requirements) => requirements?.question !== "";

const isIndicatorComplete = (requirements) =>
  requirements?.indicatorName !== "";

const isDataComplete = (requirements) =>
  Array.isArray(requirements?.data) &&
  requirements.data.every(
    (item) =>
      typeof item.value === "string" &&
      item.value.trim() !== "" &&
      item.type &&
      typeof item.type.type === "string" &&
      item.type.type.trim() !== ""
  );

/** Per-part completeness booleans for Step 1. */
export const getRequirementValidationState = (requirements) => ({
  goal: isGoalComplete(requirements),
  question: isQuestionComplete(requirements),
  indicatorName: isIndicatorComplete(requirements),
  data: isDataComplete(requirements),
});

/** True when every Step 1 part is complete (equivalent to !handleCheckDisabled). */
export const isRequirementStepComplete = (requirements) => {
  const state = getRequirementValidationState(requirements);
  return state.goal && state.question && state.indicatorName && state.data;
};

/** Human-readable labels for the parts still missing (for the guidance alert). */
export const getMissingRequirementLabels = (requirements) => {
  const state = getRequirementValidationState(requirements);
  const missing = [];
  if (!state.goal) missing.push("your goal");
  if (!state.question) missing.push("your question");
  if (!state.indicatorName) missing.push("your indicator statement");
  if (!state.data) {
    missing.push("a name and type for each required data item");
  }
  return missing;
};
