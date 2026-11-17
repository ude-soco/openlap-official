import test from "node:test";
import assert from "node:assert/strict";
import { getStepLabel, getStepOrder, getWorkflowStepOrder, getWorkflowSteps } from "./isc-selectors.js";
import { openIscStep } from "./isc-workflow-ui.js";

const workflow = (datasetFirst = false) => ({
  requirements: { locked: false, openPanel: false, step: "1" },
  path: { locked: false, openPanel: false, step: "2" },
  visualization: { locked: false, openPanel: true, step: datasetFirst ? "4" : "3" },
  dataset: { locked: false, openPanel: false, step: datasetFirst ? "3" : "4" },
  finalize: { locked: true, openPanel: false, step: "5" },
});

test("ISC navigation follows each path's actual middle-section order without changing stored placement", () => {
  const canonical = ["requirements", "path", "visualization", "dataset", "finalize"];
  assert.deepEqual(getStepOrder(), canonical, "The conceptual research-model order remains stable");
  assert.deepEqual(getWorkflowStepOrder({}), canonical, "Before path selection navigation has its canonical fallback");
  for (const datasetFirst of [false, true]) {
    const state = { lockedStep: workflow(datasetFirst) };
    const before = structuredClone(state);
    assert.deepEqual(getWorkflowStepOrder(state), datasetFirst
      ? ["requirements", "path", "dataset", "visualization", "finalize"] : canonical);
    assert.deepEqual(state, before, "Computing navigation does not rewrite the persisted step codes");
  }
});

test("ISC navigation keeps labels compact and explains the chosen path's real prerequisites", () => {
  const datasetFirst = { lockedStep: workflow(true) };
  datasetFirst.lockedStep.visualization.locked = true;
  const steps = getWorkflowSteps(datasetFirst);
  assert.deepEqual(steps.map((step) => step.label), ["Requirements", "Choose path", "Dataset", "Visualization", "Finalize"]);
  assert.equal(getStepLabel("requirements"), "Specify Requirements", "The full conceptual label remains available outside the navigator");
  assert.match(steps.find((step) => step.key === "visualization").lockedHint, /Complete Dataset/);
  const visualizationFirst = { lockedStep: workflow() };
  visualizationFirst.lockedStep.dataset.locked = true;
  assert.match(getWorkflowSteps(visualizationFirst).find((step) => step.key === "dataset").lockedHint, /Choose a visualization/);
});

test("ISC navigation reopens a placed unlocked panel without collapsing or re-locking any other phase", () => {
  const previous = workflow();
  const before = structuredClone(previous);
  const next = openIscStep(previous, "dataset");
  assert.equal(next.dataset.openPanel, true);
  assert.equal(next.visualization.openPanel, true, "The already-open visualization keeps its editor mounted");
  assert.equal(next.visualization, previous.visualization, "Other phase objects are preserved");
  assert.deepEqual(Object.fromEntries(Object.entries(next).map(([key, step]) => [key, { locked: step.locked, step: step.step }])),
    Object.fromEntries(Object.entries(before).map(([key, step]) => [key, { locked: step.locked, step: step.step }])),
    "Navigation never changes availability or persisted order");
  assert.deepEqual(previous, before, "The original workflow is unchanged");
  assert.equal(openIscStep(next, "dataset"), next, "Repeated navigation to the open phase is a no-op");
});

test("ISC navigation cannot open a locked, unknown or unplaced phase", () => {
  const previous = workflow();
  assert.equal(openIscStep(previous, "finalize"), previous);
  assert.equal(openIscStep(previous, "missing"), previous);
  assert.equal(openIscStep(previous, "__proto__"), previous);
  assert.equal(openIscStep({}, "requirements")?.requirements, undefined);
  const unplaced = { ...previous, dataset: { locked: false, openPanel: false, step: "0" } };
  assert.equal(openIscStep(unplaced, "dataset"), unplaced);
  assert.equal(getWorkflowSteps({ lockedStep: unplaced }).find((step) => step.key === "dataset").locked, true,
    "A partial legacy record cannot advertise navigation to a middle section that has not been placed");
  const incomplete = { ...previous, dataset: { openPanel: false, step: "4" } };
  assert.equal(openIscStep(incomplete, "dataset"), incomplete, "Only an explicit unlocked flag permits navigation");
});
