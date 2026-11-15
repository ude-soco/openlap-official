// Full application workflow fixture. Every identity and API response is
// synthetic; it never contacts a database, plugin runtime or deployed service.
// Start Vite with VITE_BACKEND_URL=/api/, then run with Playwright/WebKit:
// OPENLAP_TEST_BASE_URL=http://127.0.0.1:5197 node scripts/test-indicator-drafts.cjs
const { webkit } = require("playwright");
const assert = require("node:assert/strict");
const base = new URL(process.env.OPENLAP_TEST_BASE_URL || "http://127.0.0.1:5197");
assert.equal(base.protocol, "http:");
assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(base.hostname));
assert.equal(base.username + base.password + base.search + base.hash, "");
const clone = (value) => structuredClone(value);
const FIRST = "draft.first@example.test", SECOND = "draft.second@example.test";
const tokenFor = (owner) => "e30." + Buffer.from(JSON.stringify({ sub: owner, roles: ["ROLE_USER"],
  exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url") + ".fixture";
const ownerOf = (request) => {
  try { return JSON.parse(Buffer.from(request.headers().authorization.split(".")[1], "base64url")).sub; }
  catch { return null; }
};
const lrs = { id: "fixture-lrs", lrsId: "fixture-lrs", lrsTitle: "Draft fixture learning records", uniqueIdentifier: "fixture-user" };
const savedSource = { id: "saved-source", name: "Previously saved indicator", type: "BASIC", configuration: { retained: "unchanged" } };
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(predicate, description) {
  const deadline = Date.now() + 12000;
  while (!await predicate()) { assert.ok(Date.now() < deadline, description); await pause(25); }
}

async function fixture(browser, { seeded = false, legacy = null, claimed = false, loseResumeAck = false, loseDiscardAck = false } = {}) {
  const { emptyBasicState, serializeBasicDraft } = await import("../src/pages/indicators/indicator-editor/basic-indicator/utils/basic-draft-model.js");
  const makeConfiguration = (name, withLrs = false) => {
    const state = emptyBasicState(new Date("2026-11-15T10:00:00Z"));
    state.indicator.indicatorName = name;
    if (withLrs) state.dataset.selectedLRSList = [lrs];
    return serializeBasicDraft(state);
  };
  const accounts = new Map([[FIRST, new Map()], [SECOND, new Map()]]);
  const calls = [], failures = [], pendingCreates = [], terminalCommits = [];
  let sequence = 0, holdCreate = false;
  const timestamps = (index = 0) => new Date(Date.UTC(2026, 10, 15, 10, index)).toISOString();
  const seed = (id, name, type = "BASIC", extra = {}) => {
    const item = { id, name, indicatorType: type, schemaVersion: 1, revision: 3, status: "DRAFT", recoverable: true,
      configuration: type === "BASIC" ? makeConfiguration(name, id === "alpha") : { schemaVersion: 1, type, name, sources: [] },
      createdAt: timestamps(), updatedAt: timestamps(++sequence), ...extra };
    accounts.get(FIRST).set(id, item);
    return item;
  };
  if (seeded) {
    seed("alpha", "Alpha working indicator");
    seed("editing", "Editing saved baseline", "BASIC", { sourceIndicatorId: savedSource.id, sourceRevision: "saved-source-revision" });
    seed("legacy-broken", "Needs review legacy draft", "BASIC", { recoverable: false, configuration: null });
    for (let index = 1; index <= 19; index += 1) seed(`fixture-${index}`, `Working indicator ${String(index).padStart(2, "0")}`,
      ["BASIC", "COMPOSITE", "MULTI_LEVEL"][index % 3]);
  }
  if (claimed) seed("claimed", "Previously started save", "BASIC", { completionPending: true });
  if (loseDiscardAck) seed("discarding", "Draft with uncertain discard");
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  await context.routeWebSocket(/.*/, (socket) => socket.close());
  await context.addInitScript(({ token, legacy }) => {
    if (!localStorage.getItem("authTokens")) localStorage.setItem("authTokens", JSON.stringify({ access_token: token, refresh_token: token }));
    if (legacy && !sessionStorage.getItem("draft-fixture-legacy-seeded")) {
      sessionStorage.setItem("session_indicator", JSON.stringify(legacy));
      sessionStorage.setItem("draft-fixture-legacy-seeded", "yes");
    }
  }, { token: tokenFor(FIRST), legacy });
  await context.route("**/*", async (route) => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== base.origin) { failures.push(`Off-origin request: ${url.origin}`); return route.abort(); }
    if (!url.pathname.startsWith("/api/")) return route.continue();
    const path = url.pathname.slice(5), method = request.method(), owner = ownerOf(request);
    const send = (data, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
    calls.push({ path, query: Object.fromEntries(url.searchParams), method, owner, body: request.postData() ? request.postDataJSON() : undefined });
    if (!accounts.has(owner)) { failures.push("API request without a fixture account"); return send({ message: "Fixture authentication required" }, 401); }
    const store = accounts.get(owner);
    if (path === "v1/users/my") return send({ data: { name: "Draft fixture user", email: owner, roles: ["ROLE_USER"] } });
    if (path === "v1/users/my/lrs") return send({ data: [lrs] });
    if (["v1/analytics/methods", "v1/visualizations/libraries", "v1/statements/activity-types"].includes(path)) return send({ data: [] });
    if (path === "v1/indicators/my") return send({ data: { content: [savedSource], totalElements: 1,
      pageable: { pageSize: 10, pageNumber: 0 } } });
    if (path === "v1/indicators/drafts" && method === "GET") {
      const query = Object.fromEntries(url.searchParams);
      let records = [...store.values()].filter((entry) => entry.status === "DRAFT" &&
        (!query.search || entry.name.toLowerCase().includes(query.search.toLowerCase())) &&
        (!query.indicatorType || entry.indicatorType === query.indicatorType));
      const sortBy = query.sortBy || "updatedAt", direction = query.sortDirection === "asc" ? 1 : -1;
      records.sort((a, b) => String(a[sortBy]).localeCompare(String(b[sortBy])) * direction || a.id.localeCompare(b.id));
      const total = records.length, page = Number(query.page || 0), size = Number(query.size || 10);
      return send({ data: { content: records.slice(page * size, (page + 1) * size), totalElements: total,
        totalPages: Math.ceil(total / size), number: page, size } });
    }
    if (path === "v1/indicators/drafts" && method === "POST") {
      const body = request.postDataJSON();
      const acknowledge = async () => {
        let draft = [...store.values()].find((entry) => entry.clientRequestId === body.clientRequestId);
        if (!draft) {
          draft = { ...clone(body), id: `created-${++sequence}`, name: body.name.trim() || "Untitled indicator", revision: 0,
            status: "DRAFT", recoverable: true, createdAt: timestamps(), updatedAt: new Date().toISOString() };
          store.set(draft.id, draft);
        }
        await send({ data: clone(draft) }, 201);
        return draft;
      };
      if (holdCreate) return new Promise((resolve) => pendingCreates.push({ body, owner, respond: async () => {
        try { return await acknowledge(); } finally { resolve(); }
      } }));
      return acknowledge();
    }
    const resumeMatch = path.match(/^v1\/indicators\/drafts\/([^/]+)\/resume$/);
    if (resumeMatch && method === "POST") {
      const current = store.get(decodeURIComponent(resumeMatch[1]));
      assert.ok(current?.completionPending, "Only a durable claimed save needs the resume endpoint");
      terminalCommits.push({ kind: "complete", id: current.id });
      Object.assign(current, { status: "COMPLETED", configuration: null, completionPending: false,
        revision: current.revision + 1, savedIndicatorId: "saved-resumed" });
      if (loseResumeAck) {
        loseResumeAck = false;
        return send({ message: "The connection failed after the indicator was saved." }, 503);
      }
      return send({ data: clone(current) });
    }
    const match = path.match(/^v1\/indicators\/drafts\/([^/]+)$/);
    if (match) {
      const id = decodeURIComponent(match[1]), current = store.get(id);
      if (!current) return send({ message: "Draft not found" }, 404);
      if (method === "GET") return send({ data: clone(current) });
      const body = request.postDataJSON();
      const revision = method === "DELETE" ? Number(url.searchParams.get("revision")) : body.revision;
      if (revision !== current.revision) return send({ message: "This draft changed in another tab" }, 409);
      if (method === "PUT") {
        Object.assign(current, clone(body), { name: body.name.trim() || "Untitled indicator", revision: current.revision + 1, updatedAt: new Date().toISOString() });
        return send({ data: clone(current) });
      }
      if (method === "DELETE") {
        if (loseDiscardAck) {
          loseDiscardAck = false;
          terminalCommits.push({ kind: "discard", id });
          Object.assign(current, { status: "DISCARDED", configuration: null, revision: current.revision + 1 });
          return send({ message: "The connection failed after the draft was discarded." }, 503);
        }
        store.delete(id); return send({ data: { discarded: true } });
      }
    }
    failures.push(`Unexpected API request: ${method} ${path}`);
    return send({ message: "Unexpected synthetic API request" }, 500);
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => failures.push(error.message));
  return { context, page, accounts, calls, failures, pendingCreates, terminalCommits, makeConfiguration,
    holdCreates: (value) => { holdCreate = value; }, store: accounts.get(FIRST) };
}

async function dashboard(browser) {
  const f = await fixture(browser, { seeded: true });
  const { page } = f;
  const sourceBefore = clone(savedSource);
  const row = (name) => page.getByRole("table", { name: "Indicator drafts" }).getByRole("row").filter({ has: page.getByText(name, { exact: true }) });
  const latestList = () => f.calls.filter((call) => call.path === "v1/indicators/drafts" && call.method === "GET").at(-1);
  const action = async (name, kind) => {
    await row(name).getByRole("button", { name: `Actions for ${name}`, exact: true }).click();
    await page.getByRole("menuitem", { name: kind, exact: true }).click();
  };
  try {
    await page.goto(new URL("/indicator?view=drafts", base).href);
    await page.getByRole("table", { name: "Indicator drafts" }).waitFor();
    await until(() => latestList(), "Draft table loads from owner-scoped list API");
    assert.equal(latestList().query.sortBy, "updatedAt");
    assert.equal(latestList().query.sortDirection, "desc");
    await page.getByRole("button", { name: "Go to next page", exact: true }).click();
    await until(() => latestList().query.page === "1", "Pagination requests the next server page");
    await page.getByRole("combobox").last().click();
    await page.getByRole("option", { name: "25", exact: true }).click();
    await until(() => latestList().query.size === "25" && latestList().query.page === "0", "Page size resets to the first server page");
    await page.getByRole("textbox", { name: "Search drafts", exact: true }).fill("Alpha");
    await row("Alpha working indicator").waitFor();
    await until(() => latestList().query.search === "Alpha", "Draft search is sent to the server");
    await until(async () => await page.getByRole("table", { name: "Indicator drafts" }).getByRole("row").count() === 2, "Search response replaces the previous server page");
    assert.equal(await page.getByRole("table", { name: "Indicator drafts" }).getByRole("row").count(), 2);
    await page.getByRole("textbox", { name: "Search drafts", exact: true }).fill("");
    await page.getByRole("combobox", { name: "Indicator type", exact: true }).click();
    await page.getByRole("option", { name: "Composite", exact: true }).click();
    await until(() => latestList().query.indicatorType === "COMPOSITE" && latestList().query.search === "", "Type filter applies across all server pages");
    await page.getByRole("button", { name: "Indicator", exact: true }).click();
    await until(() => latestList().query.sortBy === "name" && latestList().query.sortDirection === "asc", "Name sort ascending");
    await page.getByRole("button", { name: "Indicator", exact: true }).click();
    await until(() => latestList().query.sortDirection === "desc", "Name sort descending");
    await page.getByRole("combobox", { name: "Indicator type", exact: true }).click();
    await page.getByRole("option", { name: "All types", exact: true }).click();
    await page.getByRole("textbox", { name: "Search drafts", exact: true }).fill("Alpha");
    await row("Alpha working indicator").waitFor();
    const original = clone(f.store.get("alpha"));
    await action(original.name, "Rename draft");
    await page.getByRole("textbox", { name: "Draft name", exact: true }).fill("Renamed working indicator");
    await page.getByRole("button", { name: "Save name", exact: true }).click();
    await page.getByRole("dialog", { name: "Rename draft", exact: true }).waitFor({ state: "hidden" });
    const renamed = f.store.get("alpha");
    const rename = f.calls.find((call) => call.method === "PUT" && call.path.endsWith("/alpha"));
    assert.equal(rename.body.revision, original.revision);
    assert.match(rename.body.clientRequestId, /^[0-9a-f-]{36}$/i);
    const expected = clone(original.configuration);
    expected.indicator.indicatorName = "Renamed working indicator";
    assert.deepEqual(rename.body.configuration, expected, "Rename preserves all selections and only updates the mirrored title");
    assert.equal(renamed.name, "Renamed working indicator");
    await page.getByRole("textbox", { name: "Search drafts", exact: true }).fill("Renamed");
    await row(renamed.name).waitFor();
    await action(renamed.name, "Rename draft");
    const beforeStaleRename = f.calls.filter((call) => call.method === "PUT").length;
    f.store.get("alpha").revision += 1;
    await page.getByRole("textbox", { name: "Draft name", exact: true }).fill("Stale overwrite");
    await page.getByRole("button", { name: "Save name", exact: true }).click();
    await page.getByRole("dialog").getByRole("alert").filter({ hasText: "changed since the list was loaded" }).waitFor();
    assert.equal(f.calls.filter((call) => call.method === "PUT").length, beforeStaleRename);
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await row(renamed.name).getByRole("button", { name: "Continue", exact: true }).click();
    await page.waitForURL("**/indicator/editor/drafts/alpha");
    await page.getByRole("textbox", { name: "Indicator name", exact: true }).waitFor();
    assert.equal(await page.getByRole("textbox", { name: "Indicator name", exact: true }).inputValue(), "Renamed working indicator");
    assert.ok(f.calls.some((call) => call.path === "v1/indicators/drafts/alpha" && call.method === "GET"));
    assert.equal(await page.getByText(lrs.lrsTitle, { exact: true }).count() > 0, true);

    await page.goto(new URL("/indicator?view=drafts", base).href);
    await page.getByRole("textbox", { name: "Search drafts", exact: true }).fill("Needs review");
    const broken = row("Needs review legacy draft");
    await broken.waitFor();
    assert.equal(await broken.getByRole("button", { name: "Continue", exact: true }).isDisabled(), true);
    await broken.getByRole("button", { name: "Actions for Needs review legacy draft", exact: true }).click();
    assert.equal(await page.getByRole("menuitem", { name: "Rename draft", exact: true }).getAttribute("aria-disabled"), "true");
    await page.getByRole("menuitem", { name: "Discard draft", exact: true }).click();
    await page.getByRole("dialog", { name: "Discard this draft?", exact: true }).getByRole("button", { name: "Discard draft", exact: true }).click();
    await until(() => !f.store.has("legacy-broken"), "Malformed legacy draft can be discarded safely");
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await page.getByRole("textbox", { name: "Search drafts", exact: true }).fill("Editing saved");
    await row("Editing saved baseline").waitFor();
    await action("Editing saved baseline", "Discard draft");
    const discardDialog = page.getByRole("dialog", { name: "Discard this draft?", exact: true });
    await discardDialog.getByRole("button", { name: "Cancel", exact: true }).click();
    assert.equal(f.store.has("editing"), true, "Cancel retains the edit draft");
    await discardDialog.waitFor({ state: "hidden" });
    await action("Editing saved baseline", "Discard draft");
    await discardDialog.getByRole("button", { name: "Discard draft", exact: true }).click();
    await until(() => !f.store.has("editing"), "Confirmed discard removes the private edit draft");
    const removal = f.calls.find((call) => call.method === "DELETE" && call.path.endsWith("/editing"));
    assert.equal(removal.query.revision, "3");
    assert.deepEqual(savedSource, sourceBefore, "Saved source and embeds remain untouched");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("textbox", { name: "Search drafts", exact: true }).fill("");
    await until(() => latestList().query.search === "", "Mobile list refresh");
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "Draft list has no page overflow at 390px");
    assert.deepEqual(f.failures, []);
    console.log("PASS: owner draft list search/type/sort/pagination, authoritative Continue, revision-safe Rename, confirmed Discard, malformed recovery and mobile containment");
  } finally { await f.context.close(); }
}

async function authoringAndRecovery(browser) {
  const { emptyBasicState } = await import("../src/pages/indicators/indicator-editor/basic-indicator/utils/basic-draft-model.js");
  const legacy = emptyBasicState(new Date("2026-11-15T10:00:00Z"));
  legacy.indicator.indicatorName = "Unowned legacy recovery";
  legacy.dataset.selectedLRSList = [lrs];
  legacy.analysis.analyzedData = { shouldNeverPersist: ["synthetic computed data"] };
  legacy.visualization.previewData = { scriptData: "never persist executable preview" };
  const f = await fixture(browser, { legacy });
  const { page } = f;
  try {
    await page.goto(new URL("/indicator/editor/basic", base).href);
    const name = page.getByRole("textbox", { name: "Indicator name", exact: true });
    await name.waitFor();
    await pause(1100);
    assert.equal(f.calls.filter((call) => call.method === "POST" && call.path === "v1/indicators/drafts").length, 0, "Empty editor and unknown legacy state cannot create ghost drafts");
    assert.equal(await name.inputValue(), "");
    assert.equal(await page.getByText(lrs.lrsTitle, { exact: true }).count(), 0, "Global legacy recovery is never silently adopted");
    await page.getByRole("button", { name: "Review legacy recovery", exact: true }).click();
    const restore = page.getByRole("dialog", { name: "Restore this older recovery copy?", exact: true });
    await restore.getByText(/only if it is your work/).waitFor();
    await restore.getByRole("button", { name: "Cancel", exact: true }).click();
    assert.equal(f.store.size, 0);
    f.holdCreates(true);
    await page.getByRole("button", { name: "Review legacy recovery", exact: true }).click();
    await restore.getByRole("button", { name: "Restore my work", exact: true }).click();
    await until(() => f.pendingCreates.length === 1, "Explicit ownership confirmation starts one private draft save");
    assert.equal(await page.evaluate(() => sessionStorage.getItem("session_indicator") !== null), true, "Legacy copy remains until server acknowledgment");
    await name.fill("Reviewed recovery with newer changes");
    await page.evaluate(() => { window.__draftNameInput = document.querySelector('input[value="Reviewed recovery with newer changes"]'); });
    const created = await f.pendingCreates[0].respond();
    f.holdCreates(false);
    await page.waitForURL(`**/indicator/editor/drafts/${created.id}`);
    await page.getByRole("status").filter({ hasText: "Draft saved" }).waitFor();
    assert.equal(await name.inputValue(), "Reviewed recovery with newer changes");
    assert.equal(await page.evaluate(() => window.__draftNameInput === document.querySelector('input[value="Reviewed recovery with newer changes"]')), true, "Canonical first-save URL preserves the live editor DOM");
    await until(() => f.store.get(created.id).name === "Reviewed recovery with newer changes", "Latest edits during creation reach the same draft");
    assert.equal(await page.evaluate(() => sessionStorage.getItem("session_indicator")), null, "Confirmed server save clears imported legacy recovery");
    const first = clone(f.store.get(created.id));
    assert.equal(first.configuration.analysis.analyzedData, undefined);
    assert.equal(first.configuration.visualization.previewData, undefined);
    assert.equal(first.configuration.dataset.myLRSList, undefined);
    assert.equal(f.calls.filter((call) => call.path === `v1/indicators/drafts/${created.id}` && call.method === "GET").length, 0, "Canonicalizing a new URL does not reload or remount its editor");
    await page.getByRole("link", { name: "Create an indicator", exact: true }).click();
    await page.getByRole("button", { name: "Start building a Basic indicator", exact: true }).click();
    await name.waitFor();
    assert.equal(await name.inputValue(), "");
    const createCount = f.store.size;
    await pause(1100);
    assert.equal(f.store.size, createCount, "Starting another empty editor retains existing work without creating an empty draft");
    await name.fill("Second independent working draft");
    await page.waitForURL(/\/indicator\/editor\/drafts\/created-/);
    await page.getByRole("status").filter({ hasText: "Draft saved" }).waitFor();
    assert.equal(f.store.size, 2);
    assert.deepEqual(f.store.get(created.id), first, "Starting a second draft preserves the first draft unchanged");
    await page.goto(new URL(`/indicator/editor/drafts/${created.id}`, base).href);
    await name.waitFor();
    assert.equal(await name.inputValue(), first.name);
    assert.ok(f.calls.some((call) => call.path === `v1/indicators/drafts/${created.id}` && call.method === "GET"));
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "Basic draft authoring fits mobile");

    const recoveryScope = { owner: FIRST, environment: `${base.origin}|/api/`, indicatorType: "BASIC", draftId: null, clientRequestId: "fixture-old-writer" };
    const { recoveryStorageKey } = await import("../src/pages/indicators/indicator-editor/drafts/indicator-draft-storage.js");
    const privateRecovery = { ...recoveryScope, schemaVersion: 1, name: "First account private recovery", revision: null,
      configuration: f.makeConfiguration("First account private recovery", true), updatedAt: new Date().toISOString() };
    await page.evaluate(({ key, value, token }) => {
      localStorage.setItem(key, JSON.stringify(value));
      localStorage.setItem("authTokens", JSON.stringify({ access_token: token, refresh_token: token }));
    }, { key: recoveryStorageKey(recoveryScope), value: privateRecovery, token: tokenFor(SECOND) });
    await page.goto(new URL("/indicator/editor/basic", base).href);
    await name.waitFor();
    assert.equal(await name.inputValue(), "");
    assert.equal(await page.getByRole("button", { name: "Restore recovered changes", exact: true }).count(), 0, "A second account cannot hydrate the first account's recovery");
    assert.equal(await page.getByText("First account private recovery", { exact: true }).count(), 0);
    await pause(1100);
    assert.equal(f.accounts.get(SECOND).size, 0, "Switching accounts creates no recovery-derived ghost draft");
    await page.goto(new URL("/indicator?view=drafts", base).href);
    await page.getByText("No drafts yet", { exact: true }).waitFor();
    assert.equal(f.store.size, 2, "Another account cannot mutate or list the first account's drafts");
    assert.deepEqual(f.failures, []);
    console.log("PASS: empty Basic has no ghost, explicit legacy ownership review/acknowledged cleanup, first-save canonical URL preserves DOM/latest edits, multiple drafts, authoritative resume and account isolation");
  } finally { await f.context.close(); }
}

async function terminalReconciliation(browser) {
  const f = await fixture(browser, { claimed: true, loseResumeAck: true });
  const { page } = f;
  try {
    await page.goto(new URL("/indicator/editor/drafts/claimed", base).href);
    const name = page.getByRole("textbox", { name: "Indicator name", exact: true });
    const resume = page.getByRole("button", { name: "Resume previous save", exact: true });
    await resume.waitFor();
    assert.equal(await name.isDisabled(), true, "A reloaded completion claim is readonly before any retry");
    await page.reload();
    await resume.waitFor();
    assert.equal(await name.isDisabled(), true, "The server claim survives a document reload");
    assert.equal(f.calls.some((call) => call.method === "PUT"), false, "Claimed drafts never autosave while loading");
    assert.equal(f.calls.some((call) => /analytics|visualizations|statements/.test(call.path)), false,
      "Resume-only authoring does not execute analysis, preview or plugin metadata requests");
    await resume.click();
    await page.getByRole("alert").filter({ hasText: "connection failed after the indicator was saved" }).waitFor();
    await until(async () => await resume.isEnabled(), "Resume is available after an uncertain response ends");
    assert.equal(await name.isDisabled(), true, "A lost save acknowledgment never unlocks authoring");
    assert.equal(await page.getByRole("button", { name: "Save draft", exact: true }).isDisabled(), true);
    assert.equal(await page.getByRole("button", { name: "Discard draft", exact: true }).isDisabled(), true);
    await resume.click();
    await page.waitForURL("**/indicator");
    assert.equal(f.terminalCommits.length, 1, "Receipt reconciliation cannot create a duplicate output");
    assert.equal(f.calls.filter((call) => call.path.endsWith("/resume")).length, 1,
      "A committed receipt is resolved by GET without replaying execution");
    assert.equal(f.calls.filter((call) => call.path.endsWith("/resume"))[0].body, undefined,
      "Resume uses the durable server payload, never a reconstructed client definition");
    assert.equal(f.calls.some((call) => call.method === "PUT" || call.path.endsWith("/complete")), false);
    assert.deepEqual(f.failures, []);
  } finally { await f.context.close(); }

  const d = await fixture(browser, { loseDiscardAck: true });
  try {
    await d.page.goto(new URL("/indicator/editor/drafts/discarding", base).href);
    await d.page.getByRole("button", { name: "Discard draft", exact: true }).click();
    const dialog = d.page.getByRole("dialog", { name: "Discard this draft?", exact: true });
    await dialog.getByRole("button", { name: "Discard draft", exact: true }).click();
    await dialog.getByRole("alert").filter({ hasText: "connection failed after the draft was discarded" }).waitFor();
    const retry = dialog.getByRole("button", { name: "Discard draft", exact: true });
    await until(async () => await retry.isEnabled(), "An uncertain discard can be checked again from its confirmation");
    await retry.click();
    await d.page.waitForURL("**/indicator");
    assert.equal(d.terminalCommits.length, 1);
    assert.equal(d.calls.filter((call) => call.method === "DELETE").length, 1, "Discard receipt needs no second delete");
    assert.equal(d.calls.some((call) => call.method === "PUT"), false, "No edit can race an uncertain discard");
    assert.equal(d.store.get("discarding").status, "DISCARDED");
    assert.deepEqual(d.failures, []);
    console.log("PASS: reloaded completion claims stay readonly, lost save/discard acknowledgments reconcile receipts without duplicate writes, and resume uses the server's durable payload");
  } finally { await d.context.close(); }
}

(async () => {
  const browser = await webkit.launch({ headless: true,
    ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) });
  try { await dashboard(browser); await authoringAndRecovery(browser); await terminalReconciliation(browser); }
  finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
