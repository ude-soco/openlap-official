// Real application pages with synthetic community APIs. No real accounts,
// database, deployed services or remote chart libraries are contacted.
const { webkit } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const base = new URL(process.env.OPENLAP_TEST_BASE_URL || "http://127.0.0.1:5197");
assert.equal(base.protocol, "http:");
assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(base.hostname));
assert.equal(base.username + base.password + base.search + base.hash, "");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; };
async function until(check, message) {
  const deadline = Date.now() + 15000;
  while (!await check()) { assert.ok(Date.now() < deadline, message); await sleep(25); }
}
const date = "2026-11-15T12:00:00Z";
const indicators = [
  { id: "basic", name: "Material views", type: "BASIC", method: "Count items", chart: "Bar Chart", updatedAt: date },
  { id: "composite", name: "Compare learning activities", type: "COMPOSITE", method: "Count items", chart: "Bar Chart", updatedAt: date },
  { id: "multi", name: "Clusters of learning activities", type: "MULTI_LEVEL", method: "Cluster items", chart: "Scatter Chart", updatedAt: date },
  ...Array.from({ length: 11 }, (_, index) => ({ id: `extra${index}`, name: `Sample indicator ${index}`, type: "BASIC", method: "Count items", chart: "Bar Chart", updatedAt: date })),
];
const specifications = [{ id: "isc-example", name: "Monitor learning materials", type: "ISC", goal: "Monitoring", chart: "Bar Chart", updatedAt: date }];
const tokenFor = (roles) => "e30." + Buffer.from(JSON.stringify({ sub: "community.viewer@example.test", roles,
  exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url") + ".fixture";
const frameHtml = `<!doctype html><html><body><script>
const channel=new URL(location.href).searchParams.get('channel');
addEventListener('message',event=>{if(event.source!==parent||event.origin!==location.origin||event.data.channel!==channel)return;
if(event.data.kind==='openlap:hello')parent.postMessage({kind:'openlap:ready',channel},location.origin);
if(event.data.kind==='openlap:render'){document.body.innerHTML=event.data.html;parent.postMessage({kind:'openlap:rendered',channel},location.origin);parent.postMessage({kind:'openlap:height',channel,height:340},location.origin);}});
</script></body></html>`;

async function fixture(browser, roles = ["ROLE_USER"]) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const calls = [], errors = [], listPlans = [], previewPlans = [], copyPlans = [], copies = new Map();
  await context.routeWebSocket(/.*/, (socket) => socket.close());
  await context.addInitScript((token) => localStorage.setItem("authTokens", JSON.stringify({ access_token: token, refresh_token: token })), tokenFor(roles));
  context.on("page", (page) => { page.on("pageerror", (error) => errors.push(error.message)); page.on("crash", () => errors.push("Page crashed")); });
  await context.route("**/*", async (route) => {
    const request = route.request(), url = new URL(request.url()), method = request.method();
    if (url.origin !== base.origin) { errors.push(`Off-origin request ${url.origin}`); return route.abort(); }
    if (!url.pathname.startsWith("/api/")) return route.continue();
    const endpoint = url.pathname.slice(5), query = Object.fromEntries(url.searchParams);
    const body = request.postData() ? request.postDataJSON() : undefined;
    calls.push({ endpoint, method, query, body });
    const send = async (data, status = 200) => {
      try { await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) }); }
      catch (failure) { if (!/Target.*closed|Route is already handled|route.*cancel|intercepted.*finished/i.test(failure.message)) throw failure; }
    };
    if (endpoint === "v1/users/my") return send({ data: { name: "Community fixture viewer", email: "community.viewer@example.test", roles } });
    if (endpoint === "v1/code/render") return route.fulfill({ contentType: "text/html", body: frameHtml });
    const collection = endpoint.match(/^v1\/community\/(indicators|isc)$/);
    if (collection && method === "GET") {
      const plan = listPlans.shift() || {}, kind = collection[1], rows = kind === "isc" ? specifications : indicators;
      let result = rows.filter((row) => (!query.search || row.name.toLowerCase().includes(query.search.toLowerCase()))
        && ["type", "method", "chart", "goal"].every((key) => !query[key] || row[key] === query[key]));
      result.sort((a, b) => String(a[query.sortBy] || "").localeCompare(String(b[query.sortBy] || "")) * (query.sortDirection === "asc" ? 1 : -1));
      const totalElements = result.length, page = Number(query.page || 0), size = Number(query.size || 10);
      result = result.slice(page * size, (page + 1) * size).map((row) => ({ ...row, copiedId: copies.get(row.id) || null }));
      if (plan.hold) { plan.started = true; await plan.hold.promise; }
      if (plan.fail) return send({ message: "The community pool is temporarily unavailable." }, 503);
      return send({ data: { content: result, totalElements } });
    }
    const filters = endpoint.match(/^v1\/community\/(indicators|isc)\/filters$/);
    if (filters) return send({ data: { types: ["BASIC", "COMPOSITE", "MULTI_LEVEL"], methods: ["Count items", "Cluster items"], charts: ["Bar Chart", "Scatter Chart"], goals: ["Monitoring"] } });
    const entry = endpoint.match(/^v1\/community\/(indicators|isc)\/([^/]+)(?:\/(preview|copy))?$/);
    if (entry) {
      const [, kind, id, action] = entry, row = [...indicators, ...specifications].find((item) => item.id === id);
      assert.ok(row, "Only fixture entries are requested");
      if (action === "preview" && method === "POST") {
        const plan = previewPlans.shift() || {};
        if (plan.hold) { plan.started = true; await plan.hold.promise; }
        return send({ data: plan.result || { status: "READY", version: "v1", receiptId: `proof-${id}`, visualizationTypeId: "fixture-bar",
          previewCode: encodeURIComponent(`<svg role="img" aria-label="Personal chart ${id}" width="300" height="280"><rect width="80" height="120" fill="#1976d2" /></svg>`) } });
      }
      if (action === "copy" && method === "POST") {
        const plan = copyPlans.shift() || {};
        if (plan.fail) return send({ code: "PREVIEW_CHANGED", message: "This preview expired. Run the preview again." }, 409);
        if (kind === "indicators") assert.equal(body.receiptId, `proof-${id}`, "Copy uses the successful preview receipt");
        else assert.equal(body.version, "v1", "ISC copies pin the reviewed template version");
        const ownedId = `owned-${id}`; copies.set(id, ownedId); return send({ data: { id: ownedId, alreadySaved: false } });
      }
      const detail = { ...row, version: "v1", copiedId: copies.get(id) || null, inputs: [{ name: "Items", type: "Categorical" }], outputs: [{ name: "Count", type: "Numerical" }] };
      if (kind === "isc") Object.assign(detail, {
        requirements: { goal: "Monitor material use", question: "Which materials are viewed?", indicatorName: row.name },
        columns: [{ field: "col1", headerName: "Category", type: "string" }, { field: "col2", headerName: "Value", type: "number" }],
        dataset: { columns: [], rows: [] }, exampleData: true,
        visRef: { chart: { code: "bar", type: "Bar Chart" }, data: { series: [{ name: "Example", data: [3, 5, 2] }],
          options: { chart: { type: "bar", animations: { enabled: false }, toolbar: { show: false } }, xaxis: { categories: ["Example A", "Example B", "Example C"] } }, axisOptions: {} } },
      });
      else if (row.type !== "BASIC") detail.sources = [{ label: "Source 1", method: "Count items" }, { label: "Source 2", method: "Count items" }];
      return send({ data: detail });
    }
    if (endpoint === "v1/indicators/my/workspace" || endpoint === "v1/isc/my") {
      const isc = endpoint === "v1/isc/my";
      let content = [
        { id: "own", name: "My original", indicatorName: "My original", kind: "SAVED", status: "SAVED", indicatorType: "BASIC", communityCopy: false, updatedAt: date, updatedOn: date },
        { id: "community", name: "A community copy", indicatorName: "A community copy", kind: "SAVED", status: "SAVED", indicatorType: "BASIC", communityCopy: true, updatedAt: date, updatedOn: date },
      ];
      if (query.origin) content = content.filter((item) => item.communityCopy === (query.origin === "COMMUNITY"));
      return send({ data: { content, totalElements: content.length, isc } });
    }
    errors.push(`Unexpected API request: ${method} ${endpoint}`);
    return send({ message: "Unexpected fixture request." }, 500);
  });
  const page = await context.newPage();
  return { context, page, calls, errors, listPlans, previewPlans, copyPlans, copies };
}

async function choose(page, label, option) {
  await page.getByRole("combobox", { name: new RegExp(`^${label}(?:\\s|$)`) }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}
async function closeDetail(page) { await page.getByRole("button", { name: "Close community indicator", exact: true }).click(); await page.getByRole("dialog").waitFor({ state: "hidden" }); }
async function noOverflow(page) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, "Page has no horizontal viewport overflow");
  assert.equal(await page.getByRole("table").evaluate((table) => table.scrollWidth <= table.clientWidth + 1), true, "Pool table fits its container");
}
async function screenshot(page, name) {
  const directory = process.env.OPENLAP_COMMUNITY_SCREENSHOT_DIR;
  if (!directory) return;
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  await page.mouse.move(0, 0); await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: path.join(directory, name), fullPage: !await page.getByRole("dialog").count(), animations: "disabled" });
}

(async () => {
  const browser = await webkit.launch({ headless: true,
    ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) });
  try {
    const f = await fixture(browser), { page } = f;
    await page.goto(new URL("indicator/pool", base).href);
    await page.getByRole("heading", { name: "Indicator Pool", exact: true }).waitFor();
    await until(() => page.getByRole("button", { name: "View Material views", exact: true }).count(), "Pool loaded");
    assert.equal(await page.getByText(/private creator|creator@example|original-owner-id/).count(), 0);
    await noOverflow(page); await screenshot(page, "indicator-pool-desktop.png");
    await page.getByRole("button", { name: "Go to next page", exact: true }).click();
    await until(() => f.calls.some((call) => call.endpoint === "v1/community/indicators" && call.query.page === "1"), "Pagination sent to server");
    await page.getByRole("button", { name: "Go to previous page", exact: true }).click();
    await until(async () => await page.getByRole("button", { name: "View Material views", exact: true }).count() === 1, "Previous page restored");
    await page.getByRole("button", { name: "Indicator", exact: true }).click();
    await until(() => f.calls.some((call) => call.query.sortBy === "name" && call.query.sortDirection === "asc"), "Header sort sent to server");
    await choose(page, "Indicator type", "Composite");
    await until(async () => await page.getByRole("button", { name: "View Compare learning activities", exact: true }).count() === 1 && await page.getByRole("button", { name: "View Material views", exact: true }).count() === 0, "Type filter applied");
    await choose(page, "Indicator type", "All indicator types");
    await page.getByRole("textbox", { name: "Search indicators", exact: true }).fill("not a matching item");
    await page.getByText("No matching community indicators", { exact: true }).waitFor();
    await noOverflow(page);
    await page.getByRole("textbox", { name: "Search indicators", exact: true }).fill("Material views");
    await until(async () => await page.getByRole("button", { name: "View Material views", exact: true }).count() === 1, "Search applied");
    const held = { hold: deferred() }; f.previewPlans.push(held);
    await page.getByRole("button", { name: "View Material views", exact: true }).click();
    await until(() => held.started, "Automatic preview started without a click");
    assert.equal(await page.getByRole("button", { name: "Save to My Indicators", exact: true }).isDisabled(), true);
    held.hold.resolve();
    await page.getByText("Your data is compatible. Ready to save.", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Save to My Indicators", exact: true }).click();
    await page.getByText("Saved to My Indicators as a community copy.", { exact: true }).waitFor();
    assert.equal(f.calls.filter((call) => call.endpoint.endsWith("basic/copy")).length, 1);
    await closeDetail(page);
    await page.getByText("Saved to dashboard", { exact: true }).waitFor();

    await page.getByRole("textbox", { name: "Search indicators", exact: true }).fill("");
    await until(async () => await page.getByRole("button", { name: "View Compare learning activities", exact: true }).count() === 1, "Search cleared");
    f.previewPlans.push({ result: { status: "NO_DATA", message: "No matching data for your user." } });
    await page.getByRole("button", { name: "View Compare learning activities", exact: true }).click();
    await page.getByText("No matching data for your user.", { exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Save to My Indicators", exact: true }).isDisabled(), true);
    await page.getByRole("button", { name: "Run preview again", exact: true }).click();
    await page.getByText("Your data is compatible. Ready to save.", { exact: true }).waitFor();
    f.copyPlans.push({ fail: true });
    await page.getByRole("button", { name: "Save to My Indicators", exact: true }).click();
    await page.getByText("This preview expired. Run the preview again.", { exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Save to My Indicators", exact: true }).isDisabled(), true);
    await page.getByRole("button", { name: "Run preview again", exact: true }).click();
    await page.getByText("Your data is compatible. Ready to save.", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Save to My Indicators", exact: true }).click();
    await page.getByText("Saved to My Indicators as a community copy.", { exact: true }).waitFor();
    await closeDetail(page);
    f.previewPlans.push({ result: { status: "MISSING_LRS", message: "One required connection is missing." } });
    await page.getByRole("button", { name: "View Clusters of learning activities", exact: true }).click();
    await page.getByText("One required connection is missing.", { exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Save to My Indicators", exact: true }).isDisabled(), true);
    await page.getByRole("button", { name: "Manage LRS", exact: true }).waitFor();
    await closeDetail(page);
    f.previewPlans.push({ result: { status: "READY", version: "v2", receiptId: "wrong-version", previewCode: "unreviewed chart" } });
    await page.getByRole("button", { name: "View Clusters of learning activities", exact: true }).click();
    await page.getByText("This indicator changed while the preview was running. Reload its details before saving.", { exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Save to My Indicators", exact: true }).isDisabled(), true);
    await page.getByRole("button", { name: "Reload details", exact: true }).click();
    await page.getByText("Your data is compatible. Ready to save.", { exact: true }).waitFor();
    await closeDetail(page);
    f.previewPlans.push({ result: { status: "CHOOSE_CONNECTION", message: "Choose your connected identity.", choices: [
      { lrsId: "viewer-store", lrsTitle: "Your connected data source 1", options: [{ id: "identity-one", label: "My first identity" }, { id: "identity-two", label: "My second identity" }] },
    ] } });
    await page.getByRole("button", { name: "View Clusters of learning activities", exact: true }).click();
    await page.getByText("Choose your connected identity.", { exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Save to My Indicators", exact: true }).isDisabled(), true);
    await choose(page, "Your connected data source 1", "My second identity");
    await page.getByText("Your data is compatible. Ready to save.", { exact: true }).waitFor();
    assert.deepEqual(f.calls.filter((call) => call.endpoint === "v1/community/indicators/multi/preview").at(-1).body.connections,
      { "viewer-store": "identity-two" }, "Changing a registered identity automatically reruns the personal preview");
    await closeDetail(page);
    const stale = { hold: deferred() }; f.previewPlans.push(stale);
    await page.getByRole("button", { name: "View Material views", exact: true }).click();
    await until(() => stale.started, "Held preview started");
    await closeDetail(page);
    await page.getByRole("button", { name: "View Clusters of learning activities", exact: true }).click();
    await page.getByText("Your data is compatible. Ready to save.", { exact: true }).waitFor();
    stale.hold.resolve();
    assert.equal(await page.getByRole("dialog").getByRole("heading", { name: "Clusters of learning activities", exact: true }).count(), 1);
    assert.equal(await page.frameLocator('iframe[title="OpenLAP chart preview"]').getByRole("img", { name: "Personal chart multi", exact: true }).count(), 1);
    await screenshot(page, "indicator-community-preview.png");
    await closeDetail(page);
    await page.setViewportSize({ width: 390, height: 844 }); await noOverflow(page);
    await screenshot(page, "indicator-pool-mobile.png");
    await page.getByRole("button", { name: "View Material views", exact: true }).click();
    await page.getByText("Your data is compatible. Ready to save.", { exact: true }).waitFor();
    assert.equal(await page.getByRole("dialog").evaluate((dialog) => dialog.scrollWidth <= dialog.clientWidth + 1), true);
    await screenshot(page, "indicator-community-mobile.png");
    await closeDetail(page);
    console.log("PASS community catalog, personal Basic/Composite/Multilevel preview gate, expiry, stale preview and responsive layout");

    await page.goto(new URL("isc/pool", base).href);
    await page.getByRole("button", { name: "View Monitor learning materials", exact: true }).click();
    await page.getByRole("heading", { name: "Illustrative preview", exact: true }).waitFor();
    await until(async () => await page.locator(".apexcharts-svg").count() > 0, "Synthetic ISC chart paints");
    assert.equal(await page.getByRole("button", { name: "Save to My ISCs", exact: true }).isEnabled(), true);
    const previewCalls = f.calls.filter((call) => call.endpoint.includes("/isc/") && call.endpoint.endsWith("/preview"));
    assert.equal(previewCalls.length, 0, "ISC copying does not introduce an executable LRS workflow");
    await screenshot(page, "isc-community-mobile.png");
    await page.getByRole("button", { name: "Save to My ISCs", exact: true }).click();
    await page.getByText("Saved to My ISCs as a community copy.", { exact: true }).waitFor();
    await closeDetail(page);
    for (const pathname of ["indicator", "isc"]) {
      await page.goto(new URL(pathname, base).href);
      await page.getByText("Community copy", { exact: true }).waitFor();
      await choose(page, "Origin", "Community copies");
      await until(async () => await page.getByText("My original", { exact: true }).count() === 0, "Origin filter excludes originals");
      assert.equal(await page.getByText("A community copy", { exact: true }).count(), 1);
      await noOverflow(page);
    }
    assert.deepEqual(f.errors, []); await f.context.close();
    console.log("PASS illustrative ISC save and dashboard community provenance/origin filters");

    const noLrs = await fixture(browser, ["ROLE_USER_WITHOUT_LRS"]);
    await noLrs.page.goto(new URL("indicator/pool", base).href);
    await noLrs.page.getByRole("heading", { name: "Indicator Pool", exact: true }).waitFor();
    assert.equal(await noLrs.page.getByRole("button", { name: "Indicator Editor", exact: true }).isDisabled(), true);
    assert.equal(await noLrs.page.getByRole("button", { name: "Indicator Pool", exact: true }).isEnabled(), true);
    assert.deepEqual(noLrs.errors, []); await noLrs.context.close();
    console.log("PASS community browsing without an LRS while editor stays restricted");
  } finally { await browser.close(); }
})().catch((failure) => { console.error(failure); process.exitCode = 1; });
