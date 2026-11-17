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

test("scope comparison follows the chosen scope without treating every adaptation as personal", () => {
  const scopes = ["ONLY_ME", "EXCLUDE_ME", "INCLUDE_ME"];
  for (const expected of scopes) {
    for (const actual of scopes) {
      const ref = { filters: { scope: expected } };
      const config = { filters: { selectedUserFilter: actual } };
      const row = communityReferenceRows("filters", ref, config).find((entry) => entry.key === "scope");
      assert.equal(row.status, expected === actual ? "same" : "changed");
    }
  }
  const alias = communityReferenceRows("filters", { filters: { scope: "INCLUDE_ALL" } },
    { filters: { selectedUserFilter: "INCLUDE_ME" } }).find((entry) => entry.key === "scope");
  assert.equal(alias.value, "All users");
  assert.equal(alias.status, "same");
  const missing = communityReferenceRows("filters", { filters: { scope: "ONLY_ME" } }, {}).find((entry) => entry.key === "scope");
  assert.equal(missing.status, "needed");
});

test("dataset feedback describes the viewer's connected LRS independently of user scope", () => {
  for (const selectedUserFilter of ["ONLY_ME", "EXCLUDE_ME", "INCLUDE_ME"]) {
    const row = communityReferenceRows("dataset", { dataset: { sourceCount: 1 } },
      { dataset: { selectedLRSList: [{ lrsId: "viewer-lrs" }] }, filters: { selectedUserFilter } })[0];
    assert.equal(row.status, "connection");
  }
});

const filterRows = (types, actions, selections) => communityReferenceRows("filters",
  { filters: { activityTypes: types, actions } }, { filters: { selectedActivities: selections } });
const statusFor = (rows, key) => rows.find((row) => row.key === key).status;

test("withheld identifiers compare matching visible labels without claiming identical selections", () => {
  const selections = [{ selectedActivityType: { id: "https://viewer.test/material", name: "Material" },
    selectedActionList: [{ id: "https://viewer.test/annotated", name: "Annotated" }] }];
  const before = structuredClone(selections);
  const rows = filterRows([{ id: "", name: " material " }], [{ id: "", name: "annotated" }], selections);
  assert.equal(statusFor(rows, "types"), "labelMatch");
  assert.equal(statusFor(rows, "actions"), "labelMatch");
  assert.deepEqual(selections, before, "Feedback must never rewrite the user's identifiers");
});

test("different visible actions stay changed when the original identifier is withheld", () => {
  const rows = filterRows([], [{ id: "", name: "Accessed" }], [{ selectedActionList: [{ id: "clicked", name: "Clicked" }] }]);
  assert.equal(statusFor(rows, "actions"), "changed");
});

test("known differing identifiers cannot be equated by identical names", () => {
  const rows = filterRows([{ id: "https://community.test/Material", name: "Material" }],
    [{ id: "https://community.test/annotated", name: "Annotated" }], [{
      selectedActivityType: { id: "https://community.test/material", name: "Material" },
      selectedActionList: [{ id: "https://viewer.test/annotated", name: "Annotated" }],
    }]);
  assert.equal(statusFor(rows, "types"), "changed", "IRI comparisons remain case sensitive");
  assert.equal(statusFor(rows, "actions"), "changed");
});

test("exact identifiers remain the same even if their presentation names differ", () => {
  const rows = filterRows([{ id: "pdf", name: "PDF" }], [], [{ selectedActivityType: { id: "pdf", name: "Document" } }]);
  assert.equal(statusFor(rows, "types"), "same");
});

test("mixed shared and withheld references match shared identifiers before remaining labels", () => {
  const types = [{ id: "known", name: "Document" }, { id: "", name: "material" }];
  const chosen = [{ selectedActivityType: { id: "viewer-material", name: "Material" } },
    { selectedActivityType: { id: "known", name: "Document" } }];
  assert.equal(statusFor(filterRows(types, [], chosen), "types"), "labelMatch");
  chosen[1].selectedActivityType.id = "different";
  assert.equal(statusFor(filterRows(types, [], chosen), "types"), "changed", "A hidden label must not mask a known-ID mismatch");
});

test("privacy placeholders do not become matching labels", () => {
  for (const name of ["Not shared", "Not specified", ""]) {
    const rows = filterRows([{ id: "", name }], [], [{ selectedActivityType: { id: "viewer", name: name || "Material" } }]);
    assert.equal(statusFor(rows, "types"), "uncomparable");
  }
});

test("a selection still needs to be made when reference identifiers are hidden", () => {
  const rows = filterRows([{ id: "", name: "material" }], [{ id: "", name: "annotated" }], []);
  assert.equal(statusFor(rows, "types"), "needed");
  assert.equal(statusFor(rows, "actions"), "needed");
});

test("matching labels normalize display whitespace and Unicode without changing identifiers", () => {
  const rows = filterRows([{ id: "", name: "  MATÉRIEL   DE COURS " }], [], [{
    selectedActivityType: { id: "https://viewer.test/material", name: "Mate\u0301riel de cours" },
  }]);
  assert.equal(statusFor(rows, "types"), "labelMatch");
});

test("repeated filters deduplicate the same choice but preserve distinct identifiers", () => {
  const expected = [{ id: "", name: "Material" }];
  const selection = { selectedActivityType: { id: "one", name: "Material" } };
  assert.equal(statusFor(filterRows(expected, [], [selection, selection]), "types"), "labelMatch");
  const other = { selectedActivityType: { id: "two", name: "Material" } };
  assert.equal(statusFor(filterRows(expected, [], [selection, other]), "types"), "changed");
});

test("activity comparison preserves unordered selections and exact query-language paths", () => {
  const activities = [{ id: "Material 1", name: "Material 1", queryId: "statement.object.definition.name.en-US" },
    { id: "Material 2", name: "Material 2", queryId: "statement.object.definition.name.en-US" }];
  const selected = structuredClone(activities).reverse();
  const ref = { filters: { activities } };
  const config = { filters: { selectedActivities: [{ selectedActivityList: selected }] } };
  assert.equal(statusFor(communityReferenceRows("filters", ref, config), "activities"), "same");
  selected[0].queryId = "statement.object.definition.name.de-DE";
  assert.equal(statusFor(communityReferenceRows("filters", ref, config), "activities"), "changed");
});
