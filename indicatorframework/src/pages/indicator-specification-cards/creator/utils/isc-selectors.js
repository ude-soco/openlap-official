// Pure, derived helpers for the ISC Creator workflow.
//
// See docs/ISC_ARCHITECTURE.md, "Workflow and source map". These pure functions
// derive the creator's stepper/completion view from the existing domain slices.
// Individual steps still own their transition and validation rules.

import { ISC_STEPS, ISC_STEP_ORDER, ISC_STEP_LABELS, LEGACY_STEP_CODE } from "./isc-constants.js";

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

const NAVIGATION_LABELS = {
  [ISC_STEPS.REQUIREMENTS]: "Requirements",
  [ISC_STEPS.PATH]: "Choose path",
  [ISC_STEPS.VISUALIZATION]: "Visualization",
  [ISC_STEPS.DATASET]: "Dataset",
  [ISC_STEPS.FINALIZE]: "Finalize",
};

// Dataset-first and Visualization/Task-first paths place their middle sections
// differently. Read those persisted codes without changing their meaning.
export const getWorkflowStepOrder = (domainState) => {
  const datasetFirst = domainState?.lockedStep?.dataset?.step === LEGACY_STEP_CODE.FIRST_MIDDLE ||
    domainState?.lockedStep?.visualization?.step === LEGACY_STEP_CODE.SECOND_MIDDLE;
  return [ISC_STEPS.REQUIREMENTS, ISC_STEPS.PATH,
    ...(datasetFirst ? [ISC_STEPS.DATASET, ISC_STEPS.VISUALIZATION] : [ISC_STEPS.VISUALIZATION, ISC_STEPS.DATASET]),
    ISC_STEPS.FINALIZE];
};

const lockedHint = (domainState, step) => {
  if (step === ISC_STEPS.PATH) return "Complete Requirements and continue to choose a starting path.";
  if (step === ISC_STEPS.FINALIZE) return "Complete Dataset and Visualization, then continue to Finalize.";
  if (domainState?.lockedStep?.[step]?.step === LEGACY_STEP_CODE.NONE)
    return `Choose a starting path to unlock ${NAVIGATION_LABELS[step]}.`;
  if (step === ISC_STEPS.VISUALIZATION) return domainState?.lockedStep?.visualization?.step === LEGACY_STEP_CODE.SECOND_MIDDLE
    ? "Complete Dataset and continue to unlock Visualization." : "Choose a starting path to unlock Visualization.";
  if (step === ISC_STEPS.DATASET) return domainState?.lockedStep?.dataset?.step === LEGACY_STEP_CODE.SECOND_MIDDLE
    ? "Choose a visualization and continue to unlock Dataset." : "Choose a starting path to unlock Dataset.";
  return undefined;
};

// View-model for persistent navigation. Combines the REAL runtime lock state
// (legacy `lockedStep.<phase>.locked` — the actual gate enforced by the UI) with
// the derived completeness/summary selectors. Kept here as a pure function so the
// stepper stays presentational and this stays testable.
export const getWorkflowSteps = (domainState) =>
  getWorkflowStepOrder(domainState).map((step) => ({
    key: step,
    label: NAVIGATION_LABELS[step],
    locked: domainState?.lockedStep?.[step]?.locked !== false ||
      [ISC_STEPS.DATASET, ISC_STEPS.VISUALIZATION].includes(step) &&
      ![LEGACY_STEP_CODE.FIRST_MIDDLE, LEGACY_STEP_CODE.SECOND_MIDDLE].includes(domainState?.lockedStep?.[step]?.step),
    lockedHint: lockedHint(domainState, step),
    completed: isStepComplete(domainState, step),
    summary: getStepSummary(domainState, step),
  }));

// The step the user should focus on: the first unlocked, not-yet-complete phase;
// if every unlocked phase is complete, the furthest unlocked phase; else the first.
export const getCurrentStep = (domainState) => {
  const steps = getWorkflowSteps(domainState);
  const actionable = steps.find((s) => !s.locked && !s.completed);
  if (actionable) return actionable.key;
  const lastUnlocked = [...steps].reverse().find((s) => !s.locked);
  return lastUnlocked ? lastUnlocked.key : ISC_STEP_ORDER[0];
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
