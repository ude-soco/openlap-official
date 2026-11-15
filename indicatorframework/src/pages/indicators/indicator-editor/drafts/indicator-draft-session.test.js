import test from "node:test";
import assert from "node:assert/strict";
import { createIndicatorDraftSession } from "./indicator-draft-session.js";
import { createIndicatorDraftApi } from "./indicator-draft-api.js";
import { clearAccountDraftRecovery, readDraftRecovery, recoveryStorageKey, validateDraftRecovery, writeDraftRecovery } from "./indicator-draft-storage.js";

class MemoryStorage {
  values = new Map();
  get length() { return this.values.size; }
  key(index) { return [...this.values.keys()][index] || null; }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}
class FakeClock {
  now = 0;
  next = 0;
  jobs = new Map();
  set = (callback, delay) => { const id = ++this.next; this.jobs.set(id, { callback, at: this.now + delay }); return id; };
  clear = (id) => this.jobs.delete(id);
  advance(ms) {
    const until = this.now + ms;
    for (;;) {
      const next = [...this.jobs].filter(([, job]) => job.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      this.now = next[1].at;
      this.jobs.delete(next[0]);
      next[1].callback();
    }
    this.now = until;
  }
}
const settle = async () => { for (let index = 0; index < 15; index += 1) await Promise.resolve(); };
const value = (count = 0) => ({ name: "Working indicator", configuration: { sources: Array.from({ length: count }, (_, index) => ({ id: `source-${index}` })) } });
const ownerScope = { owner: "first@example.test", environment: "http://localhost:5197|http://localhost:8097/api/", indicatorType: "COMPOSITE" };
const saved = (revision = 0, content = value(1)) => ({ id: "draft-1", revision, indicatorType: "COMPOSITE", schemaVersion: 1, status: "DRAFT", ...content, updatedAt: "2026-11-15T10:00:00Z" });
function fixture(options = {}) {
  const storage = options.storage || new MemoryStorage();
  const clock = new FakeClock();
  const calls = [];
  let createCount = 0;
  const transport = {
    create: async (body) => { calls.push({ action: "create", body }); return { ...saved(0, body), id: `draft-${++createCount}` }; },
    update: async (id, body) => { calls.push({ action: "update", id, body }); return { ...saved(body.revision + 1, body), id, revision: body.revision + 1 }; },
    get: async (id) => { calls.push({ action: "get", id }); return saved(9, value(4)); },
    discard: async (id, revision) => { calls.push({ action: "discard", id, revision }); },
    complete: async (id, body) => { calls.push({ action: "complete", id, body }); return { ...saved(body.revision), status: "COMPLETED", savedIndicatorId: "indicator-1" }; },
    ...options.transport,
  };
  let requestCount = 0;
  const session = createIndicatorDraftSession({ ...ownerScope, initialValue: value(0), storage, timers: clock,
    requestId: () => `request-${++requestCount}`, debounceMs: 200, maxWaitMs: 500,
    ...options, transport });
  return { storage, clock, calls, transport, session };
}

test("draft API unwraps envelopes, encodes IDs and keeps execution separate", async () => {
  const calls = [];
  const api = Object.fromEntries(["get", "post", "put", "delete"].map((method) => [method, async (...args) => {
    calls.push({ method, args }); return { data: { data: { id: "ack" } } };
  }]));
  const draftApi = createIndicatorDraftApi(api);
  assert.equal((await draftApi.get("draft/one")).id, "ack");
  await draftApi.update("draft/one", { revision: 2 });
  await draftApi.discard("draft/one", 3);
  await draftApi.complete("draft/one", { revision: 2, indicator: {} });
  assert.equal(calls[0].args[0], "v1/indicators/drafts/draft%2Fone");
  assert.equal(calls[2].args[0], "v1/indicators/drafts/draft%2Fone?revision=3");
  assert.ok(calls.every(({ args }) => !/preview|analyze|merge/.test(args[0])));
});

test("empty initial editor creates neither a ghost draft nor a browser recovery", async () => {
  const f = fixture();
  f.session.activate();
  f.clock.advance(10000);
  await f.session.flush();
  assert.equal(f.calls.length, 0);
  assert.equal(f.storage.length, 0);
  assert.equal(f.session.getState().status, "idle");
});

test("autosave debounces edits but maximum wait persists continuous typing", async () => {
  const f = fixture();
  for (let index = 1; index <= 5; index += 1) {
    f.session.update(value(index), true);
    f.clock.advance(100);
    await settle();
  }
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].body.configuration.sources.length, 5);
  assert.equal(f.session.getState().status, "saved");
  assert.equal(f.storage.length, 0);
});

test("one create and coalesced latest update are serialized with acknowledged revisions", async () => {
  let resolveCreate;
  const completed = [];
  const f = fixture({ onCreated: (draft) => completed.push(draft), transport: {
    create: (body) => { f.calls.push({ action: "create", body }); return new Promise((resolve) => { resolveCreate = () => resolve(saved(0, body)); }); },
  } });
  f.session.update(value(1));
  const flush = f.session.flush();
  await settle();
  f.session.update(value(2));
  f.session.update(value(3));
  assert.equal(f.calls.length, 1);
  resolveCreate();
  const result = await flush;
  assert.deepEqual(f.calls.map((call) => call.action), ["create", "update"]);
  assert.equal(f.calls[1].body.revision, 0);
  assert.equal(f.calls[1].body.configuration.sources.length, 3);
  assert.equal(result.revision, 1);
  assert.equal(completed.length, 1);
  assert.equal(completed[0].configuration.sources.length, 3);
});

test("network failure retains scoped recovery and create retry reuses idempotency key", async () => {
  const f = fixture();
  const create = f.transport.create;
  let attempt = 0;
  f.transport.create = async (body) => { if (++attempt === 1) { f.calls.push({ action: "failed-create", body }); throw new Error("Offline"); } return create(body); };
  f.session.update(value(2));
  await assert.rejects(f.session.flush(), /Offline/);
  assert.equal(f.session.getState().status, "error");
  assert.equal(readDraftRecovery({ ...ownerScope, draftId: null }, f.storage).record.configuration.sources.length, 2);
  f.clock.advance(10000);
  await settle();
  assert.equal(attempt, 1, "a failed save never loops automatically");
  await f.session.retry();
  assert.equal(f.calls[0].body.clientRequestId, f.calls[1].body.clientRequestId);
  assert.equal(f.session.getState().status, "saved");
});

test("lost create acknowledgment replays original payload then saves intervening changes", async () => {
  let stored;
  let attempt = 0;
  const f = fixture({ transport: {
    create: async (body) => {
      f.calls.push({ action: "create", body });
      if (!stored) stored = saved(0, body);
      if (++attempt === 1) throw new Error("Connection lost after commit");
      return stored;
    },
  } });
  f.session.update(value(1));
  await assert.rejects(f.session.flush(), /Connection/);
  f.session.update(value(3));
  await f.session.retry();
  assert.deepEqual(f.calls.map((call) => call.action), ["create", "create", "update"]);
  assert.deepEqual(f.calls[0].body, f.calls[1].body, "uncertain request is replayed exactly");
  assert.equal(f.calls[2].body.configuration.sources.length, 3);
  assert.equal(f.session.getState().dirty, false);
});

test("each PUT has a distinct mutation ID and uncertain PUT retry reuses its exact payload", async () => {
  let failed = false;
  const f = fixture({ initialDraft: saved(0), initialValue: value(1) });
  const update = f.transport.update;
  f.transport.update = async (id, body) => {
    if (!failed) {
      failed = true;
      f.calls.push({ action: "failed-update", id, body });
      throw new Error("Connection lost");
    }
    return update(id, body);
  };
  f.session.update(value(2));
  await assert.rejects(f.session.flush(), /Connection/);
  f.session.update(value(4));
  await f.session.retry();
  assert.deepEqual(f.calls[0].body, f.calls[1].body);
  assert.notEqual(f.calls[1].body.clientRequestId, f.calls[2].body.clientRequestId);
  assert.equal(f.calls[2].body.revision, 1);
  assert.equal(f.calls[2].body.configuration.sources.length, 4);
});

test("quota and cleanup failures cannot convert an acknowledged HTTP save into failure", async () => {
  const storage = new MemoryStorage();
  storage.setItem = () => { throw new Error("QuotaExceededError"); };
  storage.removeItem = () => { throw new Error("SecurityError"); };
  const f = fixture({ storage });
  f.session.update(value(1));
  assert.equal(f.session.getState().localAvailable, false);
  await f.session.flush();
  assert.equal(f.session.getState().status, "saved");
  assert.equal(f.session.getState().error, "");
  assert.equal(f.calls.length, 1);
});

test("local recovery is isolated by account, environment, type and draft identity", () => {
  const storage = new MemoryStorage();
  const scope = { ...ownerScope, draftId: "draft-1", clientRequestId: "request-old" };
  writeDraftRecovery(scope, { ...value(3), revision: 1, updatedAt: "2026-11-15T10:01:00Z" }, storage);
  assert.equal(readDraftRecovery(scope, storage).record.configuration.sources.length, 3);
  for (const change of [{ owner: "other@example.test" }, { environment: "production" }, { indicatorType: "MULTI_LEVEL" }, { draftId: "draft-2" }]) {
    assert.equal(readDraftRecovery({ ...scope, ...change }, storage).record, null);
  }
  assert.equal(validateDraftRecovery("{", scope), null);
  assert.equal(validateDraftRecovery(JSON.stringify({ ...scope, schemaVersion: 0 }), scope), null);
  assert.equal(clearAccountDraftRecovery({ owner: "other@example.test", environment: scope.environment }, storage).ok, true);
  assert.equal(storage.length, 1);
  clearAccountDraftRecovery(scope, storage);
  assert.equal(storage.length, 0);
});

test("one writer's acknowledgment never clears a second tab's recovery", async () => {
  const storage = new MemoryStorage();
  const scope = { ...ownerScope, draftId: "draft-1", clientRequestId: "other-tab" };
  const f = fixture({ storage, initialDraft: saved(0), initialValue: value(1) });
  writeDraftRecovery(scope, { ...value(4), revision: 0, updatedAt: "2026-11-15T10:01:00Z" }, storage);
  f.session.update(value(2));
  await f.session.flush();
  assert.equal(storage.getItem(recoveryStorageKey(scope)) !== null, true);
});

test("disabled storage reads fail safely instead of crashing the editor", () => {
  const unavailable = { get length() { throw new Error("SecurityError"); } };
  assert.deepEqual(readDraftRecovery(ownerScope, unavailable), { record: null, available: false });
  const f = fixture({ storage: unavailable });
  assert.equal(f.session.getState().localAvailable, false);
});

test("local recovery requires explicit choice and stale-revision recovery cannot overwrite server", async () => {
  const storage = new MemoryStorage();
  const scope = { ...ownerScope, draftId: "draft-1", clientRequestId: "old-request" };
  writeDraftRecovery(scope, { ...value(3), revision: 0, updatedAt: "2026-11-15T10:01:00Z" }, storage);
  const applied = [];
  const f = fixture({ storage, initialDraft: saved(2), initialValue: value(1), onApply: (next) => applied.push(next) });
  assert.equal(f.session.getState().status, "recovery");
  await assert.rejects(f.session.flush(), /restore/);
  f.session.restoreRecovery();
  assert.equal(applied[0].configuration.sources.length, 3);
  assert.equal(f.session.getState().status, "conflict");
  await assert.rejects(f.session.flush(), /newer draft/);
  await f.session.saveAsSeparateDraft();
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].action, "create");
  assert.equal(f.calls[0].body.configuration.sources.length, 3);
});

test("revision conflict blocks retries until explicit reload or separate save", async () => {
  const failure = Object.assign(new Error("A newer draft exists"), { response: { status: 409 } });
  const f = fixture({ initialDraft: saved(2), initialValue: value(1), transport: { update: async () => { throw failure; } } });
  f.session.update(value(3));
  await assert.rejects(f.session.flush(), /newer draft/);
  assert.equal(f.session.getState().status, "conflict");
  await assert.rejects(f.session.retry(), /Resolve/);
  const latest = await f.session.reloadLatest();
  assert.equal(latest.revision, 9);
  assert.equal(f.session.getState().dirty, false);
  assert.equal(f.session.getState().conflict, null);
});

test("final save flushes the newest configuration and stops later autosaves", async () => {
  const f = fixture();
  f.session.update(value(2));
  const result = await f.session.complete((latest) => ({ name: latest.name, configuration: JSON.stringify(latest.configuration) }));
  assert.equal(result.savedIndicatorId, "indicator-1");
  assert.deepEqual(f.calls.map((call) => call.action), ["create", "complete"]);
  assert.equal(f.calls[1].body.revision, 0);
  assert.equal(JSON.parse(f.calls[1].body.indicator.configuration).sources.length, 2);
  f.session.update(value(3));
  f.clock.advance(10000);
  await settle();
  assert.equal(f.calls.length, 2);
  assert.equal(f.session.getState().status, "completed");
  assert.equal(f.storage.length, 0);
});

test("discard cancels pending save, preserves saved source and clears only own recovery", async () => {
  const f = fixture({ initialDraft: { ...saved(4), sourceIndicatorId: "saved-source" }, initialValue: value(1) });
  f.session.update(value(2));
  await f.session.discard();
  f.clock.advance(10000);
  await settle();
  assert.deepEqual(f.calls, [{ action: "discard", id: "draft-1", revision: 4 }]);
  assert.equal(f.session.getState().status, "discarded");
  assert.equal(f.storage.length, 0);
});

test("rapid completion and discard clicks each share one terminal request", async () => {
  for (const action of ["complete", "discard"]) {
    let finish;
    let count = 0;
    const f = fixture({ initialDraft: saved(0), initialValue: value(1), transport: {
      [action]: () => { count += 1; return new Promise((resolve) => { finish = resolve; }); },
    } });
    const first = f.session[action]({ name: "Complete" });
    const second = f.session[action]({ name: "Complete" });
    assert.equal(first, second, "the terminal action is single-flight before React rerenders");
    assert.equal(f.session.getState().finalizing, true);
    await settle();
    assert.equal(count, 1);
    finish({ status: action === "complete" ? "COMPLETED" : "DISCARDED", savedIndicatorId: "indicator-1" });
    await Promise.all([first, second]);
    await assert.rejects(f.session[action]({}), /no longer/);
  }
});

test("discard resolves an uncertain create and clears its original pre-ID recovery", async () => {
  let stored;
  let attempt = 0;
  const f = fixture({ transport: {
    create: async (body) => {
      f.calls.push({ action: "create", body });
      stored ||= saved(0, body);
      if (++attempt === 1) throw new Error("Lost acknowledgment");
      return stored;
    },
  } });
  f.session.update(value(2));
  await assert.rejects(f.session.flush(), /Lost/);
  await f.session.discard();
  assert.deepEqual(f.calls.map((call) => call.action), ["create", "create", "discard"]);
  assert.equal(f.storage.length, 0);
});

test("discarding offered new recovery does not leave its previous writer's key behind", async () => {
  const storage = new MemoryStorage();
  writeDraftRecovery({ ...ownerScope, draftId: null, clientRequestId: "old-tab" },
    { ...value(2), revision: null, updatedAt: "2026-11-15T10:01:00Z" }, storage);
  const f = fixture({ storage });
  assert.equal(f.session.getState().status, "recovery");
  await f.session.discard();
  assert.equal(storage.length, 0);
  assert.equal(f.calls.length, 0);
});

test("late responses after disposal cannot call a new editor's callbacks or recreate cleared recovery", async () => {
  let resolve;
  const created = [];
  const f = fixture({ onCreated: (draft) => created.push(draft), transport: {
    create: (body) => new Promise((done) => { resolve = () => done(saved(0, body)); }),
  } });
  f.session.update(value(1));
  const pending = f.session.flush();
  await settle();
  f.session.update(value(2));
  f.session.dispose();
  clearAccountDraftRecovery(ownerScope, f.storage);
  resolve();
  await pending;
  assert.deepEqual(created, []);
  assert.equal(f.storage.length, 0);
});

test("strict-mode deactivate/reactivate restarts pending work without duplicate creates", async () => {
  const f = fixture();
  f.session.activate();
  f.session.update(value(1));
  f.session.dispose();
  f.session.activate();
  f.clock.advance(200);
  await settle();
  assert.equal(f.calls.length, 1);
  assert.equal(f.session.getState().status, "saved");
});

test("malformed, oversized and unrelated recovery never hydrates another account", () => {
  const storage = new MemoryStorage();
  const scope = { ...ownerScope, draftId: null, clientRequestId: "request-old" };
  storage.setItem(recoveryStorageKey(scope), "{");
  assert.equal(readDraftRecovery(scope, storage).record, null);
  assert.equal(validateDraftRecovery("x".repeat(1048577), scope), null);
  storage.setItem("session_indicator", JSON.stringify(value(2)));
  assert.equal(readDraftRecovery(scope, storage).record, null);
});
