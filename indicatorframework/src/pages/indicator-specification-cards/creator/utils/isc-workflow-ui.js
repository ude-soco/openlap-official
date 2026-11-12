// Thin workflow-UI layer for the ISC Creator (Phase E — see
// docs/ISC_CREATOR_ARCHITECTURE.md §5, §9).
//
// These helpers operate ONLY on the existing `lockedStep.openPanel` booleans to
// coordinate which section is expanded. They intentionally do NOT change the
// `lockedStep` shape, the `step` codes, or the `locked` flags — so legacy
// serialization/persistence stays byte-compatible. They are a thin coordination
// layer on top of `lockedStep`, not a replacement for it.

import { ISC_STEP_ORDER } from "./isc-constants.js";

/**
 * Returns a new lockedStep where ONLY `stepKey` is expanded (its `openPanel`
 * true, every other phase's `openPanel` false). `locked` and `step` are
 * preserved. This is what enforces the one-active-section model.
 */
export const withOnlyStepExpanded = (lockedStep, stepKey) => {
  const next = {};
  Object.keys(lockedStep).forEach((key) => {
    next[key] = { ...lockedStep[key], openPanel: key === stepKey };
  });
  return next;
};

/** Returns a new lockedStep with `stepKey` collapsed (others untouched). */
export const withStepCollapsed = (lockedStep, stepKey) => ({
  ...lockedStep,
  [stepKey]: { ...lockedStep[stepKey], openPanel: false },
});

/** The currently expanded phase key (first one with `openPanel` true), or null. */
export const getExpandedStep = (lockedStep) =>
  ISC_STEP_ORDER.find((key) => lockedStep?.[key]?.openPanel) ?? null;

/** Whether a phase is locked per the legacy gate. */
export const isStepLocked = (lockedStep, stepKey) =>
  Boolean(lockedStep?.[stepKey]?.locked);
