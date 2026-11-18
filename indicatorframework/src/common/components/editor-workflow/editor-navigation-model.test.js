import test from "node:test";
import assert from "node:assert/strict";
import { lockedStepHint, stepStatusText, viewedStepAt } from "./editor-navigation-model.js";

test("scroll viewing follows section boundaries and reaches the final short section", () => {
  const positions = [{ key: "dataset", top: -100 }, { key: "filters", top: 250 }, { key: "analysis", top: 900 }];
  assert.equal(viewedStepAt(positions, 130), "dataset");
  assert.equal(viewedStepAt(positions, 251), "filters");
  assert.equal(viewedStepAt(positions, 130, true), "analysis");
  assert.equal(viewedStepAt([], 130), null);
});

test("viewing a step does not replace its completion or prerequisite status", () => {
  assert.equal(stepStatusText({ locked: true, completed: true }), "Locked");
  assert.equal(stepStatusText({ needsReview: true, completed: true }), "Needs review");
  assert.equal(stepStatusText({ completed: true }), "Complete");
  const steps = [{ key: "dataset", label: "Dataset" }, { key: "filters", label: "Filters", locked: true }];
  assert.equal(lockedStepHint(steps, steps[1]), "Complete Dataset to open Filters.");
  assert.equal(lockedStepHint(steps, { ...steps[1], lockedHint: "Choose a connected LRS first." }), "Choose a connected LRS first.");
});
