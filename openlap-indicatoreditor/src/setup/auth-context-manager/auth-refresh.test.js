// Integration-style regression tests for the auth refresh contract.
//
// These exercise the REAL interceptor logic (`attachAuthInterceptors`) against a
// live axios instance whose transport is a custom in-memory adapter — no React,
// no DOM, no network, and no new test dependencies (axios + node:test only).
// They lock in the fixes for the "logged out while active" bug.

import { test } from "node:test";
import assert from "node:assert/strict";
import axios from "axios";
import {
  attachAuthInterceptors,
  createSingleFlight,
  shouldEndSession,
} from "./auth-refresh.js";

const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

// A tiny "server": only a request carrying the server's accepted token
// (`tokens.valid`) gets 200; anything else (e.g. the initial expired token)
// gets 403 — mirroring the backend's expired/invalid-token path. A successful
// refresh hands the client `tokens.valid`, so the retry then passes.
const makeAdapter = (tokens) => async (config) => {
  const headers = config.headers || {};
  const auth =
    typeof headers.get === "function"
      ? headers.get("Authorization")
      : headers.Authorization;
  const ok = auth === `Bearer ${tokens.valid}`;
  const response = {
    data: { ok },
    status: ok ? 200 : 403,
    statusText: ok ? "OK" : "Forbidden",
    headers: {},
    config,
  };
  if (ok) return response;
  return Promise.reject(
    new axios.AxiosError(
      "Request failed with status code 403",
      axios.AxiosError.ERR_BAD_REQUEST,
      config,
      null,
      response
    )
  );
};

// ---- createSingleFlight ----

test("createSingleFlight runs the task once for concurrent calls", async () => {
  let calls = 0;
  const sf = createSingleFlight(async () => {
    calls++;
    await tick();
    return calls;
  });
  const results = await Promise.all([sf(), sf(), sf(), sf()]);
  assert.equal(calls, 1, "task invoked exactly once");
  assert.deepEqual(results, [1, 1, 1, 1], "all callers share the one result");
});

test("createSingleFlight resets after settle (next call runs again)", async () => {
  let calls = 0;
  const sf = createSingleFlight(async () => ++calls);
  await sf();
  await sf();
  assert.equal(calls, 2);
});

test("createSingleFlight resets after rejection", async () => {
  let calls = 0;
  const sf = createSingleFlight(async () => {
    calls++;
    throw new Error("boom");
  });
  await assert.rejects(sf());
  await assert.rejects(sf());
  assert.equal(calls, 2, "lock cleared after a rejection");
});

// ---- shouldEndSession ----

test("shouldEndSession: only 401/403 end the session", () => {
  assert.equal(shouldEndSession({ response: { status: 401 } }), true);
  assert.equal(shouldEndSession({ response: { status: 403 } }), true);
  assert.equal(shouldEndSession({ response: { status: 500 } }), false);
  assert.equal(shouldEndSession({}), false); // network error: no response
  assert.equal(shouldEndSession(undefined), false);
});

// ---- attachAuthInterceptors (the actual bug surface) ----

test("concurrent 403s trigger exactly one refresh and every request retries", async () => {
  const tokens = { access: "expired", valid: "fresh" };
  let refreshCalls = 0;
  const refresh = createSingleFlight(async () => {
    refreshCalls++;
    await tick();
    tokens.access = tokens.valid; // refresh succeeded
    return { access_token: tokens.valid };
  });
  const instance = axios.create({ adapter: makeAdapter(tokens) });
  attachAuthInterceptors(instance, {
    getAccessToken: () => tokens.access,
    refresh,
  });

  const results = await Promise.all([
    instance.get("/a"),
    instance.get("/b"),
    instance.get("/c"),
    instance.get("/d"),
    instance.get("/e"),
  ]);

  assert.equal(refreshCalls, 1, "only ONE refresh for the whole herd");
  assert.ok(
    results.every((r) => r.status === 200 && r.data.ok),
    "all original requests retried successfully with the new token"
  );
});

test("a failed refresh rejects the request once, with no retry loop", async () => {
  const tokens = { access: "expired", valid: "fresh" };
  let refreshCalls = 0;
  const refresh = createSingleFlight(async () => {
    refreshCalls++;
    await tick();
    return null; // refresh failed (e.g. refresh token rejected) — token unchanged
  });
  const instance = axios.create({ adapter: makeAdapter(tokens) });
  attachAuthInterceptors(instance, {
    getAccessToken: () => tokens.access,
    refresh,
  });

  await assert.rejects(() => instance.get("/a"));
  assert.equal(refreshCalls, 1, "refresh attempted once, then gives up");
});

test("an already-retried request is not refreshed again (loop guard)", async () => {
  const tokens = { access: "expired", valid: "fresh" };
  let refreshCalls = 0;
  const refresh = createSingleFlight(async () => {
    refreshCalls++;
    return { access_token: tokens.valid };
  });
  const instance = axios.create({ adapter: makeAdapter(tokens) });
  attachAuthInterceptors(instance, {
    getAccessToken: () => tokens.access,
    refresh,
  });

  // Simulate a request that already went through the refresh+retry path.
  await assert.rejects(() => instance.get("/a", { _retry: true }));
  assert.equal(refreshCalls, 0, "guard prevents a second refresh");
});
