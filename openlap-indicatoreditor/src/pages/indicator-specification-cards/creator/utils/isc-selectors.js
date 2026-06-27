// Pure, derived helpers for the ISC Creator workflow.
//
// Phase A foundation (see docs/ISC_CREATOR_ARCHITECTURE.md §9–§11). These are
// PURE functions over the domain-state envelope produced by isc-serialization.
// They are prepared for the future stepper/reducer and are intentionally NOT yet
// wired into the existing UI, so they cannot change current behavior. Their
// completeness predicates deliberately mirror the existing inline disabled-button
// checks so the eventual wiring is behavior-preserving.

import { ISC_STEPS, ISC_STEP_ORDER, ISC_STEP_LABELS } from "./isc-constants.js";

export const getStepOrder = () => [...ISC_STEP_ORDER];

export const getStepLabel = (step) => ISC_STEP_LABELS[step] ?? "";

// Mirrors SpecifyRequirements `handleCheckDisabled`.
export const isRequirementsComplete = (domainState) => {
  const requirements = domainState?.requirements;
  if (!requirements) return false;
  const baseFilled =
    Boolean(requirements.goalType?.verb) &&
    Boolean(requirements.goal) &&
    Boolean(requirements.question) &&
    Boolean(requirements.indicatorName);
  const data = requirements.data;
  const dataFilled =
    Array.isArray(data) &&
    data.length > 0 &&
    data.every(
      (item) =>
        typeof item.value === "string" &&
        item.value.trim() !== "" &&
        item.type &&
        typeof item.type.type === "string" &&
        item.type.type.trim() !== ""
    );
  return baseFilled && dataFilled;
};

export const isPathComplete = (domainState) =>
  Boolean(domainState?.requirements?.selectedPath);

export const isVisualizationComplete = (domainState) =>
  Boolean(domainState?.visRef?.chart?.type);

// Mirrors Finalize `handleCheckDisabled`.
export const isDatasetComplete = (domainState) =>
  Boolean(domainState?.dataset?.rows?.length) &&
  Boolean(domainState?.dataset?.columns?.length);

export const isFinalizeReady = (domainState) =>
  isVisualizationComplete(domainState) && isDatasetComplete(domainState);

export const isStepComplete = (domainState, step) => {
  switch (step) {
    case ISC_STEPS.REQUIREMENTS:
      return isRequirementsComplete(domainState);
    case ISC_STEPS.PATH:
      return isPathComplete(domainState);
    case ISC_STEPS.VISUALIZATION:
      return isVisualizationComplete(domainState);
    case ISC_STEPS.DATASET:
      return isDatasetComplete(domainState);
    case ISC_STEPS.FINALIZE:
      return isFinalizeReady(domainState);
    default:
      return false;
  }
};

// A step is reachable once every prior step is complete (future-facing, derived
// from completeness rather than the legacy `lockedStep` flags).
export const isStepReachable = (domainState, step) => {
  const index = ISC_STEP_ORDER.indexOf(step);
  if (index <= 0) return true;
  return ISC_STEP_ORDER.slice(0, index).every((prior) =>
    isStepComplete(domainState, prior)
  );
};

// Short, human-readable summary for a completed step (for future WorkflowSummary).
export const getStepSummary = (domainState, step) => {
  switch (step) {
    case ISC_STEPS.REQUIREMENTS:
      return domainState?.requirements?.indicatorName || "";
    case ISC_STEPS.PATH:
      return domainState?.requirements?.selectedPath || "";
    case ISC_STEPS.VISUALIZATION:
      return domainState?.visRef?.chart?.type || "";
    case ISC_STEPS.DATASET: {
      const rows = domainState?.dataset?.rows?.length || 0;
      const columns = domainState?.dataset?.columns?.length || 0;
      return columns ? `${rows} rows × ${columns} columns` : "";
    }
    case ISC_STEPS.FINALIZE:
      return domainState?.requirements?.indicatorName || "";
    default:
      return "";
  }
};
