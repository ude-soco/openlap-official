// Real application routes with synthetic owner-scoped ISC APIs. No database,
// deployed service or external resource is contacted by this fixture.
// Start Vite with VITE_BACKEND_URL=/api/, then run with Playwright/WebKit:
// OPENLAP_TEST_BASE_URL=http://127.0.0.1:5197 npm run test:isc-dashboard
const { webkit } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const base = new URL(process.env.OPENLAP_TEST_BASE_URL || "http://127.0.0.1:5197");
assert.equal(base.protocol, "http:");
assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(base.hostname));
assert.equal(base.username + base.password + base.search + base.hash, "");
const FIRST = "isc.first@example.test", SECOND = "isc.second@example.test";
const clone = (value) => structuredClone(value);
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; };
const tokenFor = (owner) => "e30." + Buffer.from(JSON.stringify({ sub: owner, roles: ["ROLE_USER"],
  exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url") + ".fixture";
const ownerOf = (request) => {
  try { return JSON.parse(Buffer.from(request.headers().authorization.split(".")[1], "base64url")).sub; }
  catch { return null; }
};
async function until(predicate, message) {
  const deadline = Date.now() + 15000;
  while (!await predicate()) { assert.ok(Date.now() < deadline, message); await pause(25); }
}
async function screenshot(page, name) {
  const directory = process.env.OPENLAP_ISC_SCREENSHOT_DIR;
  if (!directory) return;
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  await page.mouse.move(0, 0);
  await page.getByRole("tooltip").waitFor({ state: "hidden" });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: path.join(directory, name), fullPage: page.viewportSize().width <= 500, animations: "disabled" });
}

async function fixture(browser, { empty = false, legacy = false, recoveryName = "Local recovery ISC" } = {}) {
  const { getDefaultVisRef } = await import("../src/pages/indicator-specification-cards/creator/utils/isc-workflow-reset.js");
  const domainFor = (name) => ({
    requirements: {
      goalType: { id: "monitor", verb: "monitor", category: "Monitoring", description: "", custom: false, active: true },
      goal: "Monitor use of synthetic learning materials", question: "Which materials are used?", indicatorName: name,
      selectedPath: "", data: [{ id: "material", value: "Material", type: { type: "string", value: "Categorical" } }],
      edit: { goal: false, question: false, indicatorName: true }, show: { goal: true, question: true, indicatorName: true },
    },
    dataset: { file: { name: "" }, rows: [], columns: [] }, visRef: getDefaultVisRef(),
    lockedStep: {
      requirements: { locked: false, openPanel: true, step: "1" }, path: { locked: true, openPanel: false, step: "2" },
      visualization: { locked: true, openPanel: false, step: "0" }, dataset: { locked: true, openPanel: false, step: "0" },
      finalize: { locked: true, openPanel: false, step: "5" },
    },
  });
  const accounts = new Map([[FIRST, new Map()], [SECOND, new Map()]]);
  let sequence = 0;
  const seed = (id, name, status = "SAVED", extra = {}) => {
    const item = { id, indicatorName: name, status, createdBy: FIRST,
      createdOn: new Date(Date.UTC(2026, 10, 15, 10, ++sequence)).toISOString(),
      updatedOn: new Date(Date.UTC(2026, 10, 15, 12, sequence)).toISOString(),
      visualizationType: "Bar chart", datasetRows: 10, datasetColumns: 2, domain: domainFor(name), ...extra };
    accounts.get(FIRST).set(id, item); return item;
  };
  if (!empty) {
    for (let index = 1; index <= 14; index += 1) seed(`fixture-${index}`, `Prototype ${String(index).padStart(2, "0")}`, index % 2 ? "SAVED" : "DRAFT");
    seed("legacy-saved", "Legacy saved ISC", null);
    seed("literal", "Tagged [draft] prototype", "DRAFT");
    seed("long", "ISC with a long descriptive title " + "UnbrokenName".repeat(8), "DRAFT");
    seed("draft", "Working engagement draft", "DRAFT", { draftKind: "NEW_DRAFT" });
    seed("editing", "CPU Activity Trend (editing)", "DRAFT", { draftKind: "EDIT_DRAFT", sourceId: "saved" });
    seed("saved", "CPU Activity Trend");
  }
  const calls = [], failures = [], plans = [], removePlans = [];
  const metadata = ({ domain, ...item }) => item;
  const details = (item) => ({ ...metadata(item), ...Object.fromEntries(Object.entries(item.domain).map(([key, value]) => [key, JSON.stringify(value)])) });
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  await context.routeWebSocket(/.*/, (socket) => socket.close());
  await context.addInitScript(({ token, recovery }) => {
    if (!localStorage.getItem("authTokens")) localStorage.setItem("authTokens", JSON.stringify({ access_token: token, refresh_token: token }));
    if (recovery && !sessionStorage.getItem("isc-fixture-recovery")) {
      sessionStorage.setItem("session_isc", JSON.stringify(recovery)); sessionStorage.setItem("isc-fixture-recovery", "yes");
    }
  }, { token: tokenFor(FIRST), recovery: legacy ? { id: null, ...domainFor(recoveryName) } : null });
  await context.route("**/*", async (route) => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== base.origin) { failures.push("Off-origin request: " + url.origin); return route.abort(); }
    if (!url.pathname.startsWith("/api/")) return route.continue();
    const endpoint = url.pathname.slice(5), method = request.method(), owner = ownerOf(request), store = accounts.get(owner);
    const send = (data, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
    const body = request.postData() ? request.postDataJSON() : undefined;
    calls.push({ endpoint, method, owner, query: Object.fromEntries(url.searchParams), body });
    if (!store) { failures.push("API request without a fixture owner"); return send({ message: "Authentication required." }, 401); }
    if (endpoint === "v1/users/my") return send({ data: { name: "ISC fixture user", email: owner, roles: ["ROLE_USER"] } });
    if (endpoint === "v1/analytics/goals") return send({ data: [{ id: "monitor", verb: "monitor", category: "Monitoring" }] });
    if (endpoint === "v1/isc/my" && method === "GET") {
      const plan = plans.shift() || {}, query = url.searchParams;
      const search = (query.get("search") || "").trim().toLocaleLowerCase();
      let rows = [...store.values()].filter((item) => (!query.get("status") || (item.status || "SAVED") === query.get("status"))
        && item.indicatorName.toLocaleLowerCase().includes(search));
      const sort = ["indicatorName", "createdOn", "updatedOn"].includes(query.get("sortBy")) ? query.get("sortBy") : "createdOn";
      const direction = query.get("sortDirection") === "asc" ? 1 : -1;
      rows.sort((a, b) => (String(a[sort] || "").localeCompare(String(b[sort] || "")) || a.id.localeCompare(b.id)) * direction);
      const totalElements = rows.length, size = Number(query.get("size") || 10), page = Number(query.get("page") || 0);
      rows = rows.slice(page * size, (page + 1) * size).map(metadata);
      if (plan.hold) { plan.started = true; await plan.hold.promise; }
      if (plan.fail) return send({ message: "ISC list temporarily unavailable." }, 503);
      return send({ data: { content: rows, totalElements, totalPages: Math.ceil(totalElements / size),
        pageable: { pageSize: size, pageNumber: page }, size, number: page } });
    }
    if (endpoint === "v1/isc/drafts" && method === "POST") {
      const id = "created-" + ++sequence, domain = Object.fromEntries(Object.entries(body).map(([key, value]) => [key, JSON.parse(value)]));
      const item = { id, indicatorName: domain.requirements.indicatorName, status: "DRAFT", draftKind: "NEW_DRAFT", domain, createdBy: owner,
        createdOn: new Date().toISOString(), updatedOn: new Date().toISOString() };
      store.set(id, item); return send({ data: { id, status: "DRAFT" } }, 201);
    }
    const edit = endpoint.match(/^v1\/isc\/([^/]+)\/edit-draft$/);
    if (edit && method === "POST") {
      const id = decodeURIComponent(edit[1]), original = store.get(id); assert.ok(original, "Only an owned ISC is edited");
      let item = [...store.values()].find((row) => row.sourceId === id && row.status === "DRAFT");
      if (!item) { item = { ...clone(original), id: "edit-" + id, status: "DRAFT", sourceId: id, draftKind: "EDIT_DRAFT" }; store.set(item.id, item); }
      return send({ data: { id: item.id, status: "DRAFT" } });
    }
    const target = endpoint.match(/^v1\/isc\/(drafts\/)?([^/]+)$/);
    if (target) {
      const id = decodeURIComponent(target[2]), item = store.get(id);
      assert.ok(item, "Only an owned ISC can be requested or removed");
      if (method === "GET" && !target[1]) return send({ data: details(item) });
      if (method === "PUT" && target[1]) {
        assert.equal(item.status, "DRAFT");
        item.domain = Object.fromEntries(Object.entries(body).map(([key, value]) => [key, JSON.parse(value)]));
        item.indicatorName = item.domain.requirements.indicatorName; return send({ message: "Draft saved." });
      }
      if (method === "DELETE") {
        assert.equal(Boolean(target[1]), item.status === "DRAFT", "Drafts use discard, saved ISCs use their original delete endpoint");
        const plan = removePlans.shift() || {};
        if (plan.hold) { plan.started = true; await plan.hold.promise; }
        if (plan.fail) return send({ message: "ISC removal temporarily unavailable." }, 503);
        store.delete(id); return send({ message: target[1] ? "Draft discarded." : "ISC deleted successfully." });
      }
    }
    failures.push(`Unexpected API request: ${method} ${endpoint}`); return send({ message: "Unexpected synthetic API request." }, 500);
  });
  const page = await context.newPage(); page.on("pageerror", (error) => failures.push(error.message));
  return { context, page, accounts, store: accounts.get(FIRST), calls, failures, plans, removePlans, domainFor };
}

const tableOf = (page) => page.getByRole("table", { name: "ISCs", exact: true });
const rowOf = (page, name) => tableOf(page).getByRole("row").filter({ has: page.getByText(name, { exact: true }) });
async function openMenu(page, name, action) {
  await rowOf(page, name).getByRole("button", { name: `More actions for ${name}`, exact: true }).click();
  await page.getByRole("menuitem", { name: action, exact: true }).click();
}

async function listing(browser) {
  const f = await fixture(browser), { page } = f;
  const latest = () => f.calls.filter((call) => call.endpoint === "v1/isc/my").at(-1);
  const search = page.getByRole("textbox", { name: "Search ISCs", exact: true });
  const draftsOnly = page.getByRole("checkbox", { name: "Drafts only", exact: true });
  try {
    await page.goto(new URL("/isc", base).href); await tableOf(page).waitFor();
    await rowOf(page, "CPU Activity Trend").getByText("Saved", { exact: true }).filter({ visible: true }).waitFor();
    await rowOf(page, "CPU Activity Trend (editing)").getByText("Draft", { exact: true }).filter({ visible: true }).waitFor();
    await rowOf(page, "CPU Activity Trend (editing)").getByText("Editing saved ISC", { exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: /Card view|List view|Refresh/ }).count(), 0);
    assert.equal(await page.getByRole("tab").count(), 0);
    assert.equal(latest().query.sortBy, "updatedOn"); assert.equal(latest().query.sortDirection, "desc");
    assert.equal(f.calls.filter((call) => /^v1\/isc\/[^/]+$/.test(call.endpoint) && call.endpoint !== "v1/isc/my").length, 0,
      "One paginated list renders all rows without fetching each ISC body");
    const controls = [page.getByRole("button", { name: "Create new", exact: true }), search,
      page.getByRole("combobox", { name: "Origin", exact: true }), draftsOnly];
    const geometry = () => Promise.all(controls.map((control) => control.evaluate((element) => {
      const box = (element.closest(".MuiFormControl-root") || element.closest("label") || element).getBoundingClientRect();
      return { x: box.x, y: box.y, width: box.width, height: box.height };
    })));
    const desktop = await geometry(), centers = desktop.map((control) => control.y + control.height / 2);
    assert.ok(Math.max(...centers) - Math.min(...centers) <= 2, "The ISC creation/search/draft controls align in one desktop row");
    await screenshot(page, "isc-desktop.png");
    for (const width of [900, 1024, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `ISC dashboard fits ${width}px`);
      assert.ok((await geometry()).every((control) => control.x >= 0 && control.width > 0 && control.x + control.width <= width + 1), `ISC controls wrap within ${width}px`);
      const cell = await rowOf(page, "CPU Activity Trend").getByRole("cell").first().boundingBox();
      assert.ok(cell.width >= 150, `ISC names remain readable alongside the sidebar at ${width}px`);
      await rowOf(page, "CPU Activity Trend").getByText("Saved", { exact: true }).filter({ visible: true }).waitFor();
      await rowOf(page, "CPU Activity Trend (editing)").getByText("Draft", { exact: true }).filter({ visible: true }).waitFor();
      await screenshot(page, `isc-${width}.png`);
    }
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.getByRole("button", { name: "Go to next page", exact: true }).click();
    await until(() => latest().query.page === "1", "ISC pagination uses the next server page");
    await page.getByRole("combobox").last().click(); await page.getByRole("option", { name: "25", exact: true }).click();
    await page.getByRole("listbox").waitFor({ state: "hidden" });
    await until(() => latest().query.page === "0" && latest().query.size === "25", "ISC page size resets to the first server page");
    await until(async () => await tableOf(page).getByRole("row").count() === f.store.size + 1, "All synthetic ISCs fit the larger server page");
    await rowOf(page, "Legacy saved ISC").getByText("Saved", { exact: true }).filter({ visible: true }).waitFor();
    await draftsOnly.focus(); await page.keyboard.press("Space");
    await until(() => latest().query.status === "DRAFT", "Keyboard Drafts only filter reaches the existing ISC API");
    await until(async () => await rowOf(page, "CPU Activity Trend").count() === 0, "Draft filtering removes saved ISCs");
    await draftsOnly.click(); await until(() => latest().query.status === "", "Unchecking Drafts only restores saved and unfinished ISCs");
    await search.fill("CPU");
    await until(async () => await tableOf(page).getByRole("row").count() === 3, "One ISC search includes the saved ISC and its editing draft");
    await page.getByRole("button", { name: "ISC", exact: true }).click();
    await until(() => latest().query.sortBy === "indicatorName" && latest().query.sortDirection === "asc", "ISC name sort ascending is server-side");
    await page.getByRole("button", { name: "ISC", exact: true }).click();
    await until(() => latest().query.sortDirection === "desc", "ISC name sort toggles descending");
    await search.fill("["); await rowOf(page, "Tagged [draft] prototype").waitFor();
    await until(async () => await tableOf(page).getByRole("row").count() === 2, "Special characters remain literal search text");
    const stale = { hold: deferred() }; f.plans.push(stale);
    await search.fill("Prototype"); await until(() => stale.started, "Older search request is pending");
    await page.getByRole("progressbar").waitFor();
    await search.fill("CPU"); await rowOf(page, "CPU Activity Trend").waitFor();
    stale.hold.resolve(); await page.waitForLoadState("networkidle");
    assert.equal(await tableOf(page).getByRole("row").count(), 3, "A late old search cannot replace the current ISC results");
    f.plans.push({ fail: true }); await search.fill("Failure");
    await page.getByRole("alert").filter({ hasText: "ISC list temporarily unavailable" }).waitFor();
    assert.equal(await tableOf(page).getByRole("row").count(), 1, "A failed list never presents old rows as the current query");
    await page.getByRole("button", { name: "Retry", exact: true }).click();
    await page.getByText(/No matching ISCs/).waitFor();
    await search.fill("CPU"); await rowOf(page, "CPU Activity Trend").waitFor();
    await page.evaluate((token) => localStorage.setItem("authTokens", JSON.stringify({ access_token: token, refresh_token: token })), tokenFor(SECOND));
    await page.reload(); await tableOf(page).waitFor(); await page.getByText(/No ISCs yet/).waitFor();
    assert.equal(await rowOf(page, "CPU Activity Trend").count(), 0, "A different account sees neither saved ISCs nor another owner's drafts");
    await page.setViewportSize({ width: 390, height: 844 });
    const emptyHeader = await tableOf(page).getByRole("columnheader").first().evaluate((cell) => ({
      cellWidth: cell.getBoundingClientRect().width, labelHeight: cell.querySelector(".MuiTableSortLabel-root").getBoundingClientRect().height,
    }));
    assert.ok(emptyHeader.cellWidth >= 150 && emptyHeader.labelHeight <= 32,
      `An empty mobile ISC table preserves a readable header rather than phantom colspan columns: ${JSON.stringify(emptyHeader)}`);
    await screenshot(page, "isc-empty-390.png");
    assert.deepEqual(f.failures, []);
    console.log("PASS: compact mixed ISC table, lifecycle labels, owner-scoped search/sort/pagination, keyboard Drafts only, metadata-only rows, loading/error Retry, stale-response protection and900/1024/390 containment");
  } finally { await f.context.close(); }
}

async function actions(browser) {
  const f = await fixture(browser), { page } = f;
  const sourceBefore = clone(f.store.get("saved"));
  try {
    await page.goto(new URL("/isc", base).href); await rowOf(page, "CPU Activity Trend").waitFor();
    await rowOf(page, "CPU Activity Trend").getByRole("button", { name: "Preview CPU Activity Trend", exact: true }).focus();
    await page.keyboard.press("Enter"); await page.waitForURL("**/isc/saved");
    await page.getByRole("heading", { name: /^CPU Activity Trend$/i, exact: true }).waitFor();
    await page.getByText("CPU Activity Trend", { exact: true }).waitFor();
    assert.ok(f.calls.some((call) => call.endpoint === "v1/isc/saved" && call.method === "GET"));
    await page.goto(new URL("/isc", base).href); await openMenu(page, "CPU Activity Trend", "Edit");
    await page.waitForURL("**/isc/drafts/editing");
    await page.getByRole("textbox", { name: "I need an indicator that shows", exact: true }).waitFor();
    assert.equal(await page.getByRole("textbox", { name: "I need an indicator that shows", exact: true }).inputValue(), "CPU Activity Trend (editing)");
    assert.deepEqual(f.store.get("saved"), sourceBefore, "Opening an edit draft cannot overwrite the saved ISC");
    await page.getByRole("navigation", { name: "Breadcrumb", exact: true }).getByRole("link", { name: "My ISCs", exact: true }).click();
    await page.getByRole("dialog", { name: "Leave this editing session?", exact: true })
      .getByRole("button", { name: "Keep this draft", exact: true }).click();
    await page.waitForURL("**/isc");
    await rowOf(page, "CPU Activity Trend (editing)").waitFor();
    assert.deepEqual(f.store.get("saved"), sourceBefore, "Keeping the editing draft preserves its saved source");
    assert.equal(f.store.has("editing"), true, "The guarded leave action retains the backend editing draft");
    await rowOf(page, "Working engagement draft").getByRole("button", { name: "Continue Working engagement draft", exact: true }).click();
    await page.waitForURL("**/isc/drafts/draft");
    await page.getByRole("textbox", { name: "I need an indicator that shows", exact: true }).waitFor();
    assert.equal(await page.getByRole("textbox", { name: "I need an indicator that shows", exact: true }).inputValue(), "Working engagement draft",
      "Continue loads the route-selected draft rather than a previous editing recovery");
    await page.goto(new URL("/isc", base).href); await openMenu(page, "CPU Activity Trend (editing)", "Preview saved version");
    await page.waitForURL("**/isc/saved");
    await page.getByRole("heading", { name: /^CPU Activity Trend$/i, exact: true }).waitFor();
    await page.getByText("CPU Activity Trend", { exact: true }).waitFor();
    await page.goto(new URL("/isc", base).href); await openMenu(page, "CPU Activity Trend (editing)", "Discard changes");
    let dialog = page.getByRole("dialog", { name: "Discard changes?", exact: true });
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click(); await dialog.waitFor({ state: "hidden" });
    assert.equal(f.store.has("editing"), true);
    await openMenu(page, "CPU Activity Trend (editing)", "Discard changes");
    dialog = page.getByRole("dialog", { name: "Discard changes?", exact: true });
    await dialog.getByRole("button", { name: "Discard changes", exact: true }).click();
    await until(() => !f.store.has("editing"), "Confirmed ISC edit discard uses the draft endpoint"); await dialog.waitFor({ state: "hidden" });
    assert.deepEqual(f.store.get("saved"), sourceBefore, "Discarding edit changes preserves the saved source");
    await openMenu(page, "Working engagement draft", "Discard draft");
    dialog = page.getByRole("dialog", { name: "Discard draft?", exact: true });
    await dialog.getByRole("button", { name: "Discard draft", exact: true }).click();
    await until(() => !f.store.has("draft"), "New ISC drafts can be discarded independently"); await dialog.waitFor({ state: "hidden" });
    await openMenu(page, "CPU Activity Trend", "Delete");
    dialog = page.getByRole("dialog", { name: "Delete indicator?", exact: true });
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click(); await dialog.waitFor({ state: "hidden" });
    assert.equal(f.store.has("saved"), true);
    await openMenu(page, "CPU Activity Trend", "Delete");
    dialog = page.getByRole("dialog", { name: "Delete indicator?", exact: true });
    const removal = { hold: deferred(), fail: true }; f.removePlans.push(removal);
    await dialog.getByRole("button", { name: "Delete indicator", exact: true }).click();
    await until(() => removal.started, "Confirmed ISC removal is in flight");
    assert.equal(await dialog.getByRole("button", { name: /Delete indicator|Deleting/ }).isDisabled(), true,
      "A pending removal cannot be submitted twice");
    assert.equal(f.store.has("saved"), true, "Pending confirmation does not optimistically remove the saved ISC");
    removal.hold.resolve();
    await dialog.getByRole("alert").filter({ hasText: "ISC removal temporarily unavailable" }).waitFor();
    assert.deepEqual(f.store.get("saved"), sourceBefore, "A failed removal preserves the original saved ISC");
    await dialog.getByRole("button", { name: "Delete indicator", exact: true }).click();
    await until(() => !f.store.has("saved"), "The confirmed saved ISC is deleted through its existing endpoint"); await dialog.waitFor({ state: "hidden" });
    await page.getByRole("button", { name: "Create new", exact: true }).click();
    await page.waitForURL("**/isc/new"); await page.getByRole("heading", { name: "ISC Creator", exact: true }).waitFor();
    const session = await page.evaluate(() => JSON.parse(sessionStorage.getItem("session_isc")));
    assert.equal(session.requirements.indicatorName, "", "Create new starts fresh without reusing a previous backend draft");
    assert.deepEqual(f.failures, []);
    console.log("PASS: keyboard saved preview, private saved edit, route-authoritative draft Continue, saved-version preview, confirmed discard/delete with cancel and failure preservation, clean Create new");
  } finally { await f.context.close(); }
}

async function localRecovery(browser) {
  const name = "Local recovery ISC " + "UnbrokenName".repeat(12);
  const f = await fixture(browser, { legacy: true, recoveryName: name }), { page } = f;
  const originals = clone([...f.store.entries()]);
  const recoveryName = async () => page.evaluate(() => JSON.parse(sessionStorage.getItem("session_isc"))?.requirements?.indicatorName);
  try {
    await page.goto(new URL("/isc", base).href); await tableOf(page).waitFor();
    const notice = page.getByRole("alert").filter({ hasText: `Local recovery available for “${name}”.` });
    await notice.waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "Legacy recovery feedback and actions stay within390px");
    for (const label of ["Discard recovery", "Continue recovery"]) {
      const box = await notice.getByRole("button", { name: label, exact: true }).boundingBox();
      assert.ok(box.width > 0 && box.x >= 0 && box.x + box.width <= 391, `${label} remains visible on mobile`);
    }
    await screenshot(page, "isc-recovery-390.png");
    await page.getByRole("button", { name: "Create new", exact: true }).click();
    const mobileDialog = page.getByRole("dialog", { name: "Start a new ISC?", exact: true });
    await mobileDialog.waitFor();
    for (const control of await mobileDialog.getByRole("button").all()) {
      const box = await control.boundingBox();
      assert.ok(box.width > 0 && box.x >= 0 && box.x + box.width <= 391, "Recovery confirmation actions remain visible at390px");
    }
    await screenshot(page, "isc-recovery-dialog-390.png");
    await mobileDialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await mobileDialog.waitFor({ state: "hidden" });
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.getByRole("button", { name: "Create new", exact: true }).click();
    let dialog = page.getByRole("dialog", { name: "Start a new ISC?", exact: true });
    await dialog.waitFor(); assert.equal(await recoveryName(), name, "Create cannot silently discard unfinished browser work");
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click(); await dialog.waitFor({ state: "hidden" });
    await notice.getByRole("button", { name: "Discard recovery", exact: true }).click();
    dialog = page.getByRole("dialog", { name: "Discard local recovery?", exact: true });
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click(); await dialog.waitFor({ state: "hidden" });
    assert.equal(await recoveryName(), name, "Cancelling local discard keeps the recovery copy");
    await notice.getByRole("button", { name: "Continue recovery", exact: true }).click();
    await page.waitForURL("**/isc/creator");
    await page.getByRole("textbox", { name: "I need an indicator that shows", exact: true }).waitFor();
    assert.equal(await page.getByRole("textbox", { name: "I need an indicator that shows", exact: true }).inputValue(), name);
    await page.goto(new URL("/isc", base).href); await tableOf(page).waitFor();
    await page.getByRole("button", { name: "Create new", exact: true }).click();
    dialog = page.getByRole("dialog", { name: "Start a new ISC?", exact: true });
    await dialog.getByRole("button", { name: "Discard recovery and create", exact: true }).click();
    await page.waitForURL("**/isc/new"); await page.getByRole("heading", { name: "ISC Creator", exact: true }).waitFor();
    assert.equal(await recoveryName(), "", "Explicit recovery discard starts a genuinely fresh ISC");
    for (const [id, item] of originals) assert.deepEqual(f.store.get(id), item, "Local recovery decisions preserve every saved ISC and backend draft");
    assert.equal(f.calls.some((call) => call.method === "DELETE"), false, "Discarding browser recovery never deletes server records");
    assert.deepEqual(f.failures, []);
    console.log("PASS: mobile recovery feedback, explicit create/discard confirmation, cancel preservation and Continue recovery; local actions never delete saved ISCs or backend drafts");
  } finally { await f.context.close(); }
}

(async () => {
  const browser = await webkit.launch({ headless: true,
    ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) });
  try { await listing(browser); await actions(browser); await localRecovery(browser); }
  finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
