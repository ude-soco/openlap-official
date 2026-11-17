// Presentation helpers for the Basic Indicator workflow. Completion and
// availability follow the existing flags; navigation can only reopen a section
// that the workflow has already unlocked.

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

const LOCKED_HINTS = {
  filters: "Choose a dataset and continue to unlock Filters.",
  analysis: "Complete Filters and continue to unlock Analysis.",
  visualization: "Generate an analysis preview and continue to unlock Visualization.",
};

/** Open a known, unlocked section while preserving all other workflow state. */
export const openBasicStep = (lockedStep, key) => {
  const section = lockedStep?.[key];
  if (!BASIC_STEP_ORDER.includes(key) || section?.locked !== false || section.openPanel) return lockedStep;
  return { ...lockedStep, [key]: { ...section, openPanel: true } };
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

/** Initial navigation hint; the editor navigator tracks the viewed section. */
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

/** View-model array consumed by the editor navigator. */
export const getWorkflowSteps = (lockedStep, domain = {}) =>
  BASIC_STEP_ORDER.map((key) => ({
    key,
    label: STEP_LABELS[key],
    locked: isStepLocked(lockedStep, key),
    completed: isStepCompleted(lockedStep, key),
    lockedHint: LOCKED_HINTS[key],
    summary: stepSummary(key, domain),
  }));
