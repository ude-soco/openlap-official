const test = require("node:test");
const assert = require("node:assert/strict");
const workspacePage = require("./indicator-workspace-fixture.cjs");
const saved = [
  { id: "same-id", name: "Alpha saved", type: "BASIC", createdOn: "2026-01-02T10:00:00Z", configuration: { private: true }, indicatorCode: "private code" },
  { id: "saved-2", name: "Gamma saved", type: "COMPOSITE", createdOn: "2026-01-04T10:00:00Z" },
];
const drafts = [
  { id: "same-id", name: "Beta draft", indicatorType: "BASIC", status: "DRAFT", revision: 2, updatedAt: "2026-01-03T10:00:00Z", configuration: { partial: true } },
  { id: "editing", name: "Delta edit", indicatorType: "COMPOSITE", status: "DRAFT", revision: 3, sourceIndicatorId: "saved-2", completionPending: true, updatedAt: "2026-01-05T10:00:00Z" },
  { id: "terminal", name: "Do not list", indicatorType: "BASIC", status: "COMPLETED", revision: 4 },
];
test("workspace fixture globally orders and pages saved and draft records", () => {
  const query = { sortBy: "updatedAt", sortDirection: "desc", size: 2 };
  const first = workspacePage({ saved, drafts, query });
  const second = workspacePage({ saved, drafts, query: { ...query, page: 1 } });
  assert.deepEqual(first.content.map((item) => item.name), ["Delta edit", "Gamma saved"]);
  assert.deepEqual(second.content.map((item) => item.name), ["Beta draft", "Alpha saved"]);
  assert.equal(first.totalElements, 4);
  assert.equal(first.totalPages, 2);
});
test("combined query filters both kinds and drafts-only includes edit drafts", () => {
  const result = workspacePage({ saved, drafts, query: { search: "a", indicatorType: "BASIC", sortBy: "name", sortDirection: "asc" } });
  assert.deepEqual(result.content.map((item) => item.kind), ["SAVED", "DRAFT"]);
  const only = workspacePage({ saved, drafts, query: new URLSearchParams({ draftsOnly: "true" }) });
  assert.deepEqual(only.content.map((item) => item.name), ["Delta edit", "Beta draft"]);
  assert.equal(only.content[0].completionPending, true);
});
test("workspace list metadata keeps both identities without leaking authoring payloads", () => {
  const rows = workspacePage({ saved, drafts }).content;
  assert.equal(rows.filter((item) => item.id === "same-id").length, 2);
  for (const item of rows) {
    assert.equal(item.configuration, undefined);
    assert.equal(item.indicatorCode, undefined);
    assert.ok(["SAVED", "DRAFT"].includes(item.status));
    assert.equal(item.kind, item.status);
  }
});
