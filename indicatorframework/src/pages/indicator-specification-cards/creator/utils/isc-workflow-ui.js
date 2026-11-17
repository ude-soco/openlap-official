// Thin workflow-UI layer for the ISC Creator. See docs/ISC_ARCHITECTURE.md,
// "Workflow and source map".
//
// These helpers operate ONLY on the existing `lockedStep.openPanel` booleans to
// coordinate which section is expanded. They intentionally do NOT change the
// `lockedStep` shape, the `step` codes, or the `locked` flags — so legacy
// serialization/persistence stays byte-compatible. They are a thin coordination
// layer on top of `lockedStep`, not a replacement for it.

import { ISC_STEP_ORDER, ISC_STEPS, LEGACY_STEP_CODE } from "./isc-constants.js";

/**
 * Reopen an explicitly unlocked, placed phase without changing any other
 * panel, runtime gate or persisted step code. Unplaced middle phases do not
 * have a section to navigate to until a starting path has been chosen.
 */
export const openIscStep = (lockedStep, stepKey) => {
  const section = lockedStep?.[stepKey];
  if (!ISC_STEP_ORDER.includes(stepKey) || section?.locked !== false || section.openPanel) return lockedStep;
  if ([ISC_STEPS.DATASET, ISC_STEPS.VISUALIZATION].includes(stepKey) &&
      ![LEGACY_STEP_CODE.FIRST_MIDDLE, LEGACY_STEP_CODE.SECOND_MIDDLE].includes(section.step)) return lockedStep;
  return { ...lockedStep, [stepKey]: { ...section, openPanel: true } };
};

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
