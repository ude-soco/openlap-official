// Stable constants for the ISC Creator workflow.
//
// Phase A foundation (see docs/ISC_CREATOR_ARCHITECTURE.md). These names replace
// scattered magic strings and give the future reducer/workspace a single source
// of truth. Introducing them does NOT change any visible behavior.

// Bumped only when the *internal* domain-state shape changes in a way the
// serialization adapter must migrate. NOTE: this version is currently stamped
// only on the client domain model + local draft, NOT on the server payload —
// see isc-serialization.js for why.
export const ISC_SCHEMA_VERSION = 1;

// The five conceptual phases (research model — must never be removed/renamed in
// meaning). Values intentionally match the keys used by the legacy `lockedStep`
// object so selectors can address either interchangeably.
export const ISC_STEPS = Object.freeze({
  REQUIREMENTS: "requirements",
  PATH: "path",
  VISUALIZATION: "visualization",
  DATASET: "dataset",
  FINALIZE: "finalize",
});

// Canonical conceptual order of the phases.
export const ISC_STEP_ORDER = Object.freeze([
  ISC_STEPS.REQUIREMENTS,
  ISC_STEPS.PATH,
  ISC_STEPS.VISUALIZATION,
  ISC_STEPS.DATASET,
  ISC_STEPS.FINALIZE,
]);

export const ISC_STEP_LABELS = Object.freeze({
  [ISC_STEPS.REQUIREMENTS]: "Specify Requirements",
  [ISC_STEPS.PATH]: "Choose Path",
  [ISC_STEPS.VISUALIZATION]: "Choose Visualization",
  [ISC_STEPS.DATASET]: "Choose Dataset",
  [ISC_STEPS.FINALIZE]: "Finalize Indicator",
});

// Legacy `lockedStep.<phase>.step` codes.
//
// ⚠️ These string values are PERSISTED inside saved ISCs (the backend stores
// `lockedStep` as a mandatory JSON string). Their *values* must never change or
// existing saved ISCs break. The named keys only document what each code means:
//   - REQUIREMENTS / PATH / FINALIZE are fixed positions.
//   - FIRST_MIDDLE / SECOND_MIDDLE encode the order of the two middle phases
//     (Visualization / Dataset) after the user picks a Path.
//   - NONE means the middle phase has not been placed yet.
export const LEGACY_STEP_CODE = Object.freeze({
  NONE: "0",
  REQUIREMENTS: "1",
  PATH: "2",
  FIRST_MIDDLE: "3",
  SECOND_MIDDLE: "4",
  FINALIZE: "5",
});

// Path choices. Values mirror the existing `pathChoices` map (persisted in
// `requirements.selectedPath`) — values must not change.
export const ISC_PATHS = Object.freeze({
  VISUALIZATION: "Visualization",
  DATASET: "Dataset",
  TASK: "Task",
});
