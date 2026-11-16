// Real application, synthetic owner-bound APIs. No deployed service, actual
// account, database or external chart runtime is contacted.
const { webkit } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const base = new URL(process.env.OPENLAP_TEST_BASE_URL || "http://127.0.0.1:5204");
assert.equal(base.protocol, "http:"); assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(base.hostname));
assert.equal(base.username + base.password + base.search + base.hash, "");
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(check, label) { const end = Date.now() + 12000; while (!await check()) { assert.ok(Date.now() < end, label); await wait(25); } }
(async () => {
  const { emptyBasicState, serializeBasicDraft } = await import("../src/pages/indicators/indicator-editor/basic-indicator/utils/basic-draft-model.js");
  const { newComplexConfiguration } = await import("../src/pages/indicators/indicator-editor/complex-indicator/complex-model.js");
  const state = emptyBasicState(new Date("2026-11-15T12:00:00Z"));
  for (const item of Object.values(state.lockedStep)) { item.locked = false; item.openPanel = true; }
  const reference = { name: "Community material accesses", type: "BASIC", dataset: { sourceCount: 1, outputs: [{ id: "activities", name: "Activities", type: "Text" }] },
    filters: { activityTypes: [{ id: "pdf", name: "PDF" }], actions: [{ id: "accessed", name: "Accessed" }], activities: [{ id: "public-material", name: "Material" }], scope: "ONLY_ME", timeframe: { from: "2026-01-01", until: "2026-11-01" } },
    analysis: { method: { id: "count", name: "Count items", available: false }, params: [{ id: "limit", name: "Number of items", value: 10 }], mapping: { mapping: [] } },
    visualization: { library: { id: "c3", name: "C3", available: false }, chart: { id: "bar", name: "Bar Chart", available: false }, mapping: { mapping: [] }, params: { height: 500 } } };
  let draft = { id: "adaptation-draft", name: "My adapted indicator", indicatorType: "BASIC", schemaVersion: 1, revision: 0, status: "DRAFT", recoverable: true,
    configuration: serializeBasicDraft(state), adaptation: { schemaVersion: 1, poolId: "community-basic", sourceVersion: "v1", reference }, sourceIndicatorId: null };
  const drafts = new Map([[draft.id, draft]]);
  const calls = [], errors = [];
  let stage = "starting browser";
  let connected = false;
  const longLrs = { id: "own", lrsId: "own", uniqueIdentifier: "viewer", lrsTitle: "A connected learning record store with a long descriptive title" };
  const token = "e30." + Buffer.from(JSON.stringify({ sub: "adaptation.viewer@example.test", roles: ["ROLE_USER_WITHOUT_LRS"], exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url") + ".fixture";
  console.log("Launching local synthetic WebKit fixture…");
  const browser = await webkit.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) });
  console.log("WebKit connected; preparing fixture…");
  const contexts = [];
  const routeRequest = async (route) => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== base.origin) { errors.push(`Off-origin request ${url.origin}`); return route.abort(); }
    if (!url.pathname.startsWith("/api/")) return route.continue();
    const path = url.pathname.slice(5), method = request.method(), body = request.postData() ? request.postDataJSON() : null;
    calls.push({ path, method, body });
    const send = (data, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify({ data }) });
    if (path === "v1/users/my") return send({ name: "Adaptation viewer", roles: ["ROLE_USER_WITHOUT_LRS"] });
    if (path === "v1/community/indicators/filters") return send({ types: ["BASIC"], methods: ["Count items"], charts: ["Bar Chart"] });
    if (path === "v1/community/indicators") return send({ content: [{ id: "community-basic", name: reference.name, type: "BASIC", method: "Count items", chart: "Bar Chart" }], totalElements: 1 });
    if (path === "v1/community/indicators/community-basic") return send({ id: "community-basic", name: reference.name, type: "BASIC", version: "v1", method: "Count items" });
    if (path.endsWith("/preview")) return send({ status: "NO_CONNECTION" });
    if (path === "v1/community/indicators/community-basic/adaptations") { assert.match(body.clientRequestId, /^[0-9a-f-]{36}$/); return send(draft); }
    const draftMatch = path.match(/^v1\/indicators\/drafts\/([^/]+)$/);
    if (draftMatch) {
      const id = draftMatch[1], stored = drafts.get(id);
      assert.ok(stored, "Only a fixture-owned draft can be requested");
      if (method === "PUT") {
        assert.equal(body.revision, stored.revision);
        const acknowledged = { ...stored, ...body, revision: stored.revision + 1 };
        drafts.set(id, acknowledged);
        if (id === draft.id) draft = acknowledged;
      }
      return send(drafts.get(id));
    }
    if (path === "v1/analytics/methods/outputs/count") return send([]);
    if (path === "v1/users/my/lrs") return send(connected ? [longLrs] : []);
    if (["v1/statements/activity-types", "v1/analytics/methods", "v1/visualizations/libraries"].includes(path)) return send([]);
    errors.push(`Unexpected API ${method} ${path}`); return send({}, 500);
  };
  const createContext = async (viewport) => {
    const context = await browser.newContext({ viewport });
    contexts.push(context);
    await context.routeWebSocket(/.*/, (socket) => socket.close());
    await context.addInitScript((token) => localStorage.setItem("authTokens", JSON.stringify({ access_token: token, refresh_token: token })), token);
    await context.route("**/*", routeRequest);
    context.on("page", (opened) => {
      opened.setDefaultTimeout(12000);
      opened.on("pageerror", (error) => errors.push(error.message));
      opened.on("crash", () => errors.push(`Browser page crashed at ${opened.url()}`));
    });
    return context;
  };
  const desktop = { width: 1680, height: 1000 }, mobile = { width: 390, height: 844 };
  let page = await (await createContext(desktop)).newPage();
  try {
    stage = "opening community pool"; console.log("Opening local Indicator Pool…");
    await page.goto(new URL("indicator/pool", base).href);
    await page.getByRole("button", { name: `View ${reference.name}`, exact: true }).click();
    await page.getByText("Connect your LRS in Manage LRS before previewing this indicator.", { exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Adapt to my data", exact: true }).isEnabled(), true, "Incompatibility/no LRS never blocks creating an adaptation");
    stage = "starting private adaptation";
    await page.getByRole("button", { name: "Adapt to my data", exact: true }).dblclick();
    await page.waitForURL("**/indicator/editor/drafts/adaptation-draft");
    await page.getByRole("heading", { name: "Adapt a Basic Indicator", exact: true }).waitFor();
    await until(() => page.getByRole("heading", { name: "Community reference", exact: true }).count().then((count) => count === 4), "Every opened Basic section has its own contextual reference");
    assert.equal(calls.filter((call) => call.path.endsWith("/adaptations")).length, 1, "Double activation creates one request");
    assert.equal(await page.getByRole("radio", { name: "Use data of all users", exact: true }).isEnabled(), false);
    assert.equal(await page.getByRole("radio", { name: "Use only my data", exact: true }).isChecked(), true);
    assert.equal(await page.getByText("Accessed", { exact: true }).count() > 0, true, "Unavailable original remains in the reference");
    assert.equal(await page.getByRole("button", { name: "Manage LRS", exact: true }).count(), 1);
    const noOverflow = async () => {
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, "No horizontal editor overflow");
      assert.equal(await page.locator("section").evaluateAll((sections) => sections.filter((section) => section.scrollWidth > section.clientWidth + 1).length), 0, "No horizontal scrolling inside workflow sections");
    };
    await noOverflow();
    if (process.env.OPENLAP_ADAPTATION_SCREENSHOT_DIR) { await fs.mkdir(process.env.OPENLAP_ADAPTATION_SCREENSHOT_DIR, { recursive: true });
      await page.screenshot({ path: path.join(process.env.OPENLAP_ADAPTATION_SCREENSHOT_DIR, "basic-adaptation-desktop.png"), fullPage: true }); }
    stage = "autosaving and reloading Basic adaptation";
    const name = page.getByRole("textbox", { name: "Indicator name", exact: true });
    await name.fill("My adapted indicator after reload");
    await until(() => draft.name === "My adapted indicator after reload" && calls.some((call) =>
      call.method === "PUT" && call.body?.name === "My adapted indicator after reload"), "The exact renamed value reaches the server");
    await page.getByText("Draft saved", { exact: true }).waitFor();
    await page.reload(); await page.getByRole("heading", { name: "Adapt a Basic Indicator", exact: true }).waitFor();
    await until(() => page.getByRole("heading", { name: "Community reference", exact: true }).count().then((count) => count === 4), "Frozen reference survives reload");
    stage = "checking narrow Basic adaptation";
    // Separate device contexts keep storage/rendering isolated while sharing
    // this account's authoritative server drafts. Each starts at its viewport.
    page = await (await createContext(mobile)).newPage();
    await page.goto(new URL(`indicator/editor/drafts/${draft.id}`, base).href);
    await page.getByRole("heading", { name: "Adapt a Basic Indicator", exact: true }).waitFor();
    await until(() => page.getByRole("button", { name: /^Community reference/ }).evaluateAll((buttons) =>
      buttons.length === 4 && buttons.every((button) => button.getAttribute("aria-expanded") === "false")), "References start collapsed in the narrow layout");
    await noOverflow(); await page.getByText("Draft saved", { exact: true }).waitFor();
    connected = true;
    const connectedDraft = { ...draft, id: "adaptation-connected", revision: 0,
      configuration: { ...draft.configuration, dataset: { selectedLRSList: [longLrs] } } };
    drafts.set(connectedDraft.id, connectedDraft);
    await page.goto(new URL(`indicator/editor/drafts/${connectedDraft.id}`, base).href);
    await page.getByRole("heading", { name: "Adapt a Basic Indicator", exact: true }).waitFor();
    await page.getByText(longLrs.lrsTitle, { exact: true }).waitFor(); await noOverflow();
    if (process.env.OPENLAP_ADAPTATION_SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.OPENLAP_ADAPTATION_SCREENSHOT_DIR, "basic-adaptation-mobile.png"), fullPage: true });
    stage = "checking responsive complex source controls";
    const complex = newComplexConfiguration("COMPOSITE");
    complex.sources = ["source-one", "source-two"].map((id, index) => ({ id, name: `Source ${index + 1}`, outputs: [],
      analyticsMethod: { id: "count", name: "Count N most occurring or least occurring items" }, keyColumnId: "", measureColumnIds: [] }));
    complex.sourceDrafts = Object.fromEntries(complex.sources.map((source) => [source.id, serializeBasicDraft(emptyBasicState())]));
    await page.getByText("Draft saved", { exact: true }).waitFor();
    const compositeDraft = { ...draft, id: "adaptation-composite", revision: 0, indicatorType: "COMPOSITE", configuration: { ...complex, name: draft.name } };
    drafts.set(compositeDraft.id, compositeDraft);
    await page.goto(new URL(`indicator/editor/drafts/${compositeDraft.id}`, base).href);
    await page.getByRole("list", { name: "Source indicators to adapt", exact: true }).waitFor();
    assert.equal(await page.getByText("Needs your selections", { exact: true }).count(), 2, "Source status remains fully readable on mobile");
    assert.equal(await page.getByRole("button", { name: "Edit source", exact: true }).evaluateAll((buttons) => buttons.every((button) => button.clientWidth >= 80 && button.clientHeight <= 60)), true, "Mobile source actions fit on a readable line");
    await noOverflow();
    if (process.env.OPENLAP_ADAPTATION_SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.OPENLAP_ADAPTATION_SCREENSHOT_DIR, "complex-adaptation-sources-mobile.png"), fullPage: true });
    page = await (await createContext(desktop)).newPage();
    await page.goto(new URL(`indicator/editor/drafts/${compositeDraft.id}`, base).href);
    await page.getByRole("table", { name: "Source indicators to adapt", exact: true }).waitFor(); await noOverflow();
    assert.equal(calls.some((call) => /analyze|adaptation-preview|\/complete$/.test(call.path)), false, "Opening and autosaving a partial adaptation does not execute plugins");
    assert.deepEqual(errors, []);
    console.log("Community adaptation passed: incompatible/no-LRS entry, idempotent start, contextual reference, personal scope, reload and responsive layout.");
  } catch (failure) {
    // A closed/crashed page must not replace the actual failed assertion with a
    // second diagnostic error. Print the original before best-effort details.
    console.error(`Community adaptation failed while ${stage}:`, failure);
    console.error("Fixture requests:", calls.map(({ path, method }) => ({ path, method })));
    console.error("Fixture errors:", errors);
    if (!page.isClosed()) {
      const body = await page.locator("body").innerText({ timeout: 2000 }).catch(() => "Page body unavailable");
      console.error("Fixture page:", page.url(), body);
    }
    throw failure;
  }
  finally {
    for (const context of contexts) await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
})().catch((failure) => { console.error(failure); process.exitCode = 1; });
