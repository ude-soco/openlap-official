// Unit tests for the pure token helpers (Node's built-in runner, no deps).
// Run with:  npm test
/* global Buffer */

import { test } from "node:test";
import assert from "node:assert/strict";
import { safeDecode, isTokenExpired } from "./auth-tokens.js";

// Build a structurally-valid JWT with the given payload (signature is irrelevant
// to decoding — jwt-decode only base64url-decodes the payload segment).
const makeToken = (payload) =>
  `header.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.sig`;

test("safeDecode returns payload for a valid token", () => {
  const token = makeToken({ sub: "a@b.c", exp: 9999999999 });
  assert.equal(safeDecode(token).sub, "a@b.c");
});

test("safeDecode returns null for missing/garbage tokens (never throws)", () => {
  assert.equal(safeDecode(null), null);
  assert.equal(safeDecode(undefined), null);
  assert.equal(safeDecode(""), null);
  assert.equal(safeDecode("not-a-jwt"), null);
  assert.doesNotThrow(() => safeDecode("a.b"));
});

test("isTokenExpired: future exp → not expired", () => {
  const future = Math.floor(Date.now() / 1000) + 3600;
  assert.equal(isTokenExpired(makeToken({ exp: future })), false);
});

test("isTokenExpired: past exp → expired", () => {
  const past = Math.floor(Date.now() / 1000) - 10;
  assert.equal(isTokenExpired(makeToken({ exp: past })), true);
});

test("isTokenExpired: skew treats a soon-to-expire token as expired", () => {
  const soon = Math.floor(Date.now() / 1000) + 5; // expires in 5s
  assert.equal(isTokenExpired(makeToken({ exp: soon }), 0), false);
  assert.equal(isTokenExpired(makeToken({ exp: soon }), 30), true);
});

test("isTokenExpired: missing/undecodable/no-exp → treated as expired", () => {
  assert.equal(isTokenExpired(null), true);
  assert.equal(isTokenExpired("garbage"), true);
  assert.equal(isTokenExpired(makeToken({ sub: "no-exp" })), true);
});
