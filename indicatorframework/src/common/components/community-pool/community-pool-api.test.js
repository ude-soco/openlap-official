import test from "node:test";
import assert from "node:assert/strict";
import { canSaveCommunityPreview, communityError, requestCommunityCopy,
  requestCommunityDetail, requestCommunityPool, requestCommunityPreview } from "./community-pool-api.js";

test("community save requires a successful current preview receipt and a rendered chart", () => {
  assert.equal(canSaveCommunityPreview({ status: "READY", receiptId: "proof" }, true), true);
  for (const status of ["NO_DATA", "CHECKING", "ERROR", "EXPIRED", "INCOMPATIBLE"]) {
    assert.equal(canSaveCommunityPreview({ status, receiptId: "proof" }, true), false);
  }
  assert.equal(canSaveCommunityPreview({ status: "READY" }, true), false);
  assert.equal(canSaveCommunityPreview({ status: "READY", receiptId: "proof" }, false), false);
});

test("pool API uses dedicated community endpoints and a receipt-gated POST copy", async () => {
  const calls = [];
  const api = {
    get: async (...args) => { calls.push(["GET", ...args]); return { data: { data: { content: [] } } }; },
    post: async (...args) => { calls.push(["POST", ...args]); return { data: { data: { id: "owned-copy" } } }; },
  };
  await requestCommunityPool(api, "indicators", { search: "a & b", sortBy: "name", sortDirection: "asc" });
  await requestCommunityDetail(api, "isc", "opaque/id");
  await requestCommunityPreview(api, "opaque", { store: "my-connection" });
  await requestCommunityCopy(api, "indicators", "opaque", "viewer-proof");
  await requestCommunityCopy(api, "isc", "opaque", undefined, "version1");
  assert.equal(calls[0][1], "v1/community/indicators?search=a+%26+b&sortBy=name&sortDirection=asc");
  assert.equal(calls[1][1], "v1/community/isc/opaque%2Fid");
  assert.deepEqual(calls[2].slice(0, 3), ["POST", "v1/community/indicators/opaque/preview", { connections: { store: "my-connection" } }]);
  assert.deepEqual(calls[3], ["POST", "v1/community/indicators/opaque/copy", { receiptId: "viewer-proof" }]);
  assert.deepEqual(calls[4], ["POST", "v1/community/isc/opaque/copy", { version: "version1" }]);
  await assert.rejects(() => requestCommunityDetail(api, "private", "id"), /Unknown community pool/);
});

test("transport diagnostics do not become community-facing errors", () => {
  assert.equal(communityError({ message: "private URL and token" }, "Try again."), "Try again.");
  assert.equal(communityError({ response: { data: { message: "No matching data." } } }, "Try again."), "No matching data.");
});
