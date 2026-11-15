import test from "node:test";
import assert from "node:assert/strict";
import { closedRecoveryRequest } from "./closed-draft-recovery.js";

const recovery = { owner: "owner@example.test", environment: "http://localhost|/api/", indicatorType: "BASIC",
  draftId: "closed-draft", clientRequestId: "original-writer", name: "Local changes",
  configuration: { schemaVersion: 1, type: "BASIC", indicator: { indicatorName: "Local changes", type: "BASIC" } } };

test("closed recovery copying retains one idempotency identity across refresh and key ordering", () => {
  const first = closedRecoveryRequest(recovery);
  const reloaded = { ...JSON.parse(JSON.stringify(recovery)), updatedAt: "2026-11-15T12:00:00Z" };
  reloaded.configuration = { indicator: { type: "BASIC", indicatorName: "Local changes" }, type: "BASIC", schemaVersion: 1 };
  assert.equal(closedRecoveryRequest(reloaded).clientRequestId, first.clientRequestId);
  assert.match(first.clientRequestId, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.deepEqual(first.configuration, recovery.configuration);
  assert.equal(first.schemaVersion, 1);
});

test("different accounts, environments, writers and recovered work receive separate copy identities", () => {
  const original = closedRecoveryRequest(recovery).clientRequestId;
  for (const change of [{ owner: "other@example.test" }, { environment: "production" }, { draftId: "other-draft" },
    { clientRequestId: "other-writer" }, { name: "Changed work" }, { configuration: { schemaVersion: 1, type: "BASIC" } }]) {
    assert.notEqual(closedRecoveryRequest({ ...recovery, ...change }).clientRequestId, original);
  }
});
