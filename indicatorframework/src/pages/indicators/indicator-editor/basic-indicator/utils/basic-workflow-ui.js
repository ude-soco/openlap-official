// Read-only workflow-UI helpers for the Basic Indicator wizard.
//
// These derive presentation state (which step is current, each step's
// active/completed/locked status, and a short stepper summary) PURELY from the
// existing `lockedStep` flags and the domain selections. They do NOT mutate
// `lockedStep`, change its shape/step-codes, or alter the unlock conditions —
// progression is still owned by each step's own "Next" button. This is a thin
// view layer on top of the legacy state, mirroring the ISC Creator approach.

export const BASIC_STEP_ORDER = [
  "dataset",
  "filters",
  "analysis",
  "visualization",
];

const STEP_LABELS = {
  dataset: "Dataset",
  filters: "Filters",
  analysis: "Analysis",
  visualization: "Visualization",
};

// The step whose `locked` flag flips when a given step's "Next" is pressed.
// A step counts as "completed" once its successor is unlocked — i.e. the user
// has progressed past it. (Visualization completes when finalize unlocks.)
const NEXT_STEP = {
  dataset: "filters",
  filters: "analysis",
  analysis: "visualization",
  visualization: "finalize",
};

export const isStepLocked = (lockedStep, key) =>
  Boolean(lockedStep?.[key]?.locked);

export const isStepCompleted = (lockedStep, key) => {
  const next = NEXT_STEP[key];
  return next ? !lockedStep?.[next]?.locked : false;
};

/** "locked" | "active" | "completed" | "available" for a single step. */
export const getStepStatus = (lockedStep, key) => {
  if (isStepLocked(lockedStep, key)) return "locked";
  if (lockedStep?.[key]?.openPanel) return "active";
  if (isStepCompleted(lockedStep, key)) return "completed";
  return "available";
};

/** Key of the step to mark current: the expanded one, else first unlocked. */
export const getCurrentStep = (lockedStep) =>
  BASIC_STEP_ORDER.find((key) => lockedStep?.[key]?.openPanel) ??
  BASIC_STEP_ORDER.find((key) => !isStepLocked(lockedStep, key)) ??
  "dataset";

/** The first still-locked step (the one being unlocked next), or null. */
export const getNextLockedStep = (lockedStep) =>
  BASIC_STEP_ORDER.find((key) => isStepLocked(lockedStep, key)) ?? null;

/**
 * Whether a step's card should be rendered yet. Mirrors the ISC Creator, which
 * reveals steps progressively: every unlocked step plus the single next locked
 * step (so the user sees what's coming) — but nothing beyond that. Read-only:
 * it never changes `lockedStep`, the unlock conditions, or step order.
 */
export const isStepRevealed = (lockedStep, key) =>
  !isStepLocked(lockedStep, key) || key === getNextLockedStep(lockedStep);

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// Short, guarded summary shown under each stepper node (real data only).
const stepSummary = (key, domain = {}) => {
  const { dataset, filters, analysis, visualization } = domain;
  switch (key) {
    case "dataset": {
      const count = dataset?.selectedLRSList?.length ?? 0;
      return count ? plural(count, "source") : undefined;
    }
    case "filters": {
      const count = filters?.selectedActivities?.length ?? 0;
      return count ? plural(count, "activity filter") : undefined;
    }
    case "analysis":
      return analysis?.selectedAnalyticsMethod?.method?.name || undefined;
    case "visualization":
      return visualization?.selectedType?.name || undefined;
    default:
      return undefined;
  }
};

/** View-model array consumed by the shared WorkflowStepper. */
export const getWorkflowSteps = (lockedStep, domain = {}) =>
  BASIC_STEP_ORDER.map((key) => ({
    key,
    label: STEP_LABELS[key],
    locked: isStepLocked(lockedStep, key),
    completed: isStepCompleted(lockedStep, key),
    summary: stepSummary(key, domain),
  }));
