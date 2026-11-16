import test from "node:test";
import assert from "node:assert/strict";
import { communityReferenceRows, comparisonStatus } from "./community-reference-model.js";
const reference = { filters: { activityTypes: [{ id: "pdf", name: "PDF" }], actions: [{ id: "accessed", name: "Accessed" }], activities: [{ id: "one", name: "Material" }] },
  analysis: { method: { id: "count", name: "Count" }, params: [{ id: "n", name: "Number", value: 0 }] },
  visualization: { library: { id: "c3", name: "C3" }, chart: { id: "bar", name: "Bar" } } };
test("comparison never equates semantically similar actions or applies changes", () => {
  const config = { filters: { selectedActivities: [{ selectedActivityType: { id: "pdf" }, selectedActionList: [{ id: "clicked" }] }] } };
  const original = structuredClone(config);
  const rows = communityReferenceRows("filters", reference, config);
  assert.equal(rows.find((row) => row.key === "types").status, "same");
  assert.equal(rows.find((row) => row.key === "actions").status, "changed");
  assert.equal(rows.find((row) => row.key === "activities").status, "needed");
  assert.deepEqual(config, original);
});
test("unavailable choice remains readable without treating it as a current selection", () => {
  const rows = communityReferenceRows("analysis", { analysis: { method: { id: "gone", name: "Retired method", available: false } } }, {});
  assert.equal(rows[0].value, "Retired method"); assert.equal(rows[0].status, "unavailable");
});
test("zero parameter is a valid comparison and Basic/complex metadata both compare exactly", () => {
  assert.equal(comparisonStatus("0", "0"), "same");
  assert.equal(communityReferenceRows("analysis", reference, { analysis: { methodId: "count", params: [{ id: "n", value: 0 }] } })[0].status, "same");
  const vis = communityReferenceRows("visualization", reference, { visualization: { libraryId: "c3", typeId: "bar" } });
  assert.equal(vis[0].status, "same"); assert.equal(vis[1].status, "same");
});
