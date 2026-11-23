import test from "node:test";
import assert from "node:assert/strict";
import { canSaveCommunityPreview, communityError, requestCommunityCopy,
  requestCommunityDetail, requestCommunityExample, requestCommunityPool, requestCommunityPreview, requestSearchGoals,
  searchCommunityIndicators } from "./community-pool-api.js";

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
  await requestCommunityExample(api, "opaque/id");
  await requestCommunityPreview(api, "opaque", { store: "my-connection" });
  await requestCommunityCopy(api, "indicators", "opaque", "viewer-proof");
  await requestCommunityCopy(api, "isc", "opaque", undefined, "version1");
  assert.equal(calls[0][1], "v1/community/indicators?search=a+%26+b&sortBy=name&sortDirection=asc");
  assert.equal(calls[1][1], "v1/community/isc/opaque%2Fid");
  assert.equal(calls[2][1], "v1/community/indicators/opaque%2Fid/example-preview");
  assert.deepEqual(calls[3].slice(0, 3), ["POST", "v1/community/indicators/opaque/preview", { connections: { store: "my-connection" } }]);
  assert.deepEqual(calls[4], ["POST", "v1/community/indicators/opaque/copy", { receiptId: "viewer-proof" }]);
  assert.deepEqual(calls[5], ["POST", "v1/community/isc/opaque/copy", { version: "version1" }]);
  await assert.rejects(() => requestCommunityDetail(api, "private", "id"), /Unknown community pool/);
});

test("transport diagnostics do not become community-facing errors", () => {
  assert.equal(communityError({ message: "private URL and token" }, "Try again."), "Try again.");
  assert.equal(communityError({ response: { data: { message: "No matching data." } } }, "Try again."), "No matching data.");
});

test("semantic queries stay in the POST body and carry the current pool filters and pagination", async () => {
  const calls = [], signal = new AbortController().signal;
  const api = { post: async (...args) => { calls.push(args); return { data: { data: { searchMode: "semantic" } } }; } };
  const options = { page: 1, size: 10, sortBy: "relevance", sortDirection: "desc", type: "BASIC", chart: "Bar Chart", method: "Count items" };
  for (const criteria of [{ mode: "basic", text: "Who reads the course material?" },
    { mode: "advanced", goalVerb: "Monitor", goalDescription: "", question: "Who reads?", indicatorDescription: "" }]) {
    assert.deepEqual(await searchCommunityIndicators(api, criteria, { ...options, goal: "", search: "" }, signal), { searchMode: "semantic" });
    assert.deepEqual(calls.at(-1), ["v1/community/indicators/search", { ...criteria, ...options }, { signal }]);
  }
});

test("advanced search offers unique active goal verbs from the ISC vocabulary", async () => {
  const api = { get: async (path) => {
    assert.equal(path, "v1/analytics/goals/active");
    return { data: { data: [{ verb: "Monitor" }, { verb: "Compare" }, { verb: "Monitor" }, {}] } };
  } };
  assert.deepEqual(await requestSearchGoals(api), ["Compare", "Monitor"]);
});
