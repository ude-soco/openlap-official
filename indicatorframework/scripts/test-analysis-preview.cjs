// Start Vite with VITE_BACKEND_URL=/api/ and Playwright/WebKit on Node's module path:
// OPENLAP_TEST_BASE_URL=http://127.0.0.1:5181 npm run test:analysis-preview
// All API responses and identities below are synthetic; off-origin requests fail.
const { webkit } = require("playwright");
const assert = require("node:assert/strict");
const inertAssets = new Set([
  "https://cdnjs.cloudflare.com/ajax/libs/c3/0.7.18/c3.min.css",
  "https://d3js.org/d3.v5.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/c3/0.7.18/c3.min.js",
  "https://cdn.jsdelivr.net/npm/apexcharts@8.8.1/dist/apexcharts.min.js",
]);

const base = new URL(process.env.OPENLAP_TEST_BASE_URL || "http://127.0.0.1:5181");
assert.equal(base.protocol, "http:");
assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(base.hostname));
assert.equal(base.username + base.password + base.search + base.hash, "");

const column = (id, type, data) => ({ configurationData: { id, title: id, type }, data });
const columns = (label) => ({
  item_name: column("item_name", "Text", label === undefined ? [] : [label]),
  item_count: column("item_count", "Numeric", label === undefined ? [] : [0]),
});
const input = { id: "items", title: "Items", type: "Text", required: true };
const output = { id: "statement.object.definition.name.en-US", type: "Text", name: "Activities" };
const method = { id: "fixture-method", name: "Fixture method", description: "Synthetic analysis" };
const source = { id: "fixture-source", lrsId: "fixture-source", lrsTitle: "Fixture source", uniqueIdentifier: "fixture-user" };
const activityType = { id: "fixture-type", name: "Fixture type" };
const action = { id: "fixture-action", name: "Fixture action" };
const activity = { id: "Fixture activity", name: "Fixture activity", queryId: output.id };
const chartInput = { id: "labels", title: "Labels", type: "Text", required: true };
const chartOutput = { id: "item_name", title: "item_name", type: "Text" };
const chart = { id: "fixture-chart", name: "Fixture chart", chartInputs: [chartInput] };
const library = { id: "fixture-library", name: "Fixture charts" };

function session(data, visualizationOpen = false) {
  return {
    indicator: { indicatorName: "", type: "BASIC" },
    dataset: { myLRSList: [source], selectedLRSList: [source] },
    filters: {
      selectedUserFilter: "ONLY_ME",
      selectedTime: { from: "2020-01-01T00:00:00.000Z", until: "2021-01-01T00:00:00.000Z" },
      activityTypesList: [activityType],
      selectedActivities: [{ id: "fixture-filter", selectedActivityType: activityType,
        actionOnActivityList: [action], selectedActionList: [action],
        activityList: [activity], selectedActivityList: [activity] }],
    },
    analysis: {
      analyticsMethodList: [method], inputs: [{ ...input, selectedInput: output }],
      params: [{ id: "limit", title: "Limit", type: "Textbox", dataType: "INTEGER", defaultValue: 10, value: 10 }],
      selectedAnalyticsMethod: { method, mapping: { mapping: [{ inputPort: input, outputPort: output }] } },
      analyzedData: data,
    },
    visualization: {
      libraryList: [library], selectedLibrary: visualizationOpen ? library : { id: "", name: "" },
      typeList: visualizationOpen ? [chart] : [],
      selectedType: visualizationOpen ? chart : { id: "", name: "", chartInputs: [] },
      inputs: visualizationOpen ? [{ ...chartInput, selectedInput: chartOutput }] : [],
      params: { height: 500, width: 500 },
      mapping: { mapping: visualizationOpen ? [{ inputPort: chartInput, outputPort: chartOutput }] : [] },
      previewData: { displayCode: [], scriptData: {} },
    },
    lockedStep: {
      dataset: { locked: false, openPanel: false, step: "1" },
      filters: { locked: false, openPanel: false, step: "2" },
      analysis: { locked: false, openPanel: true, step: "3" },
      visualization: { locked: !visualizationOpen, openPanel: visualizationOpen, step: "4" },
      finalize: { locked: true, openPanel: false, step: "5" },
    },
  };
}

async function until(predicate, description) {
  const deadline = Date.now() + 10000;
  while (!predicate()) {
    assert.ok(Date.now() < deadline, description);
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

async function fixture(browser, saved) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  // Development HMR must not replace modules during a synthetic scenario.
  await context.routeWebSocket(/.*/, (socket) => socket.close());
  const failures = [], analysisRequests = [], chartRequests = [];
  const token = "e30." + Buffer.from(JSON.stringify({ sub: "fixture@localhost", roles: ["ROLE_USER"],
    exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url") + ".fixture";
  await context.addInitScript(({ token, saved }) => {
    localStorage.setItem("authTokens", JSON.stringify({ access_token: token, refresh_token: token }));
    sessionStorage.setItem("session_indicator", JSON.stringify(saved));
  }, { token, saved });
  await context.route("**/*", async (route) => {
    const request = route.request(), url = new URL(request.url());
    if (inertAssets.has(url.href)) return route.fulfill({
      contentType: url.pathname.endsWith(".css") ? "text/css" : "application/javascript", body: "/* Isolated UI fixture. */",
    });
    if (url.origin !== base.origin) {
      failures.push("Off-origin request: " + url.origin);
      return route.abort();
    }
    if (!url.pathname.startsWith("/api/")) return route.continue();
    const path = url.pathname.slice(5);
    const send = (data, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
    if (path === "v1/indicators/basic/analyze" || path === "v1/indicators/basic/preview") {
      const queue = path.endsWith("analyze") ? analysisRequests : chartRequests;
      return new Promise((resolve) => queue.push({ body: request.postDataJSON(),
        respond: async (data, status = 200) => { await send(data, status); resolve(); } }));
    }
    const responses = {
      "v1/users/my/lrs": [source], "v1/users/my": { name: "Fixture user", email: "fixture@localhost", roles: ["ROLE_USER"] },
      "v1/analytics/methods": [method],
      "v1/analytics/methods/input-params/fixture-method": { inputs: [input], params: [] },
      "v1/visualizations/libraries": [library],
      "v1/visualizations/libraries/fixture-library/types": [chart],
    };
    if (!(path in responses)) failures.push("Unexpected API request: " + path);
    await send({ data: responses[path] ?? {}, message: "Synthetic fixture" });
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => {
    failures.push(error.message);
    console.error("Browser error:", error.stack);
  });
  await page.goto(new URL("/indicator/editor/basic", base).href);
  const analysis = page.getByRole("region", { name: "Analysis step", exact: true });
  await analysis.getByRole("button", { name: "Next", exact: true }).waitFor();
  return { context, page, analysis, analysisRequests, chartRequests, failures };
}

async function recovery(browser) {
  const f = await fixture(browser, session(columns()));
  try {
    const next = f.analysis.getByRole("button", { name: "Next", exact: true });
    await f.analysis.getByText("No data for this combination", { exact: true }).waitFor();
    assert.equal(await next.isDisabled(), true);
    await f.analysis.getByRole("button", { name: "Run preview again", exact: true }).click();
    await until(() => f.analysisRequests.length === 1, "First analysis request");
    await f.analysis.getByText("Running analysis…", { exact: true }).first().waitFor();
    assert.equal(await f.analysis.getByRole("button", { name: "Running analysis…", exact: true }).isDisabled(), true);
    assert.equal(await next.isDisabled(), true);
    assert.equal(await f.analysis.getByText("No data for this combination", { exact: true }).count(), 0);
    await f.analysisRequests[0].respond({ data: { columns: columns("Fixture result") } });
    await f.analysis.getByRole("cell", { name: "Fixture result", exact: true }).waitFor();
    assert.equal(await next.isEnabled(), true);

    await f.analysis.getByRole("button", { name: "Run preview again", exact: true }).click();
    await until(() => f.analysisRequests.length === 2, "Rerun request");
    assert.equal(await f.analysis.getByRole("cell", { name: "Fixture result", exact: true }).count(), 0);
    assert.equal(await next.isDisabled(), true);
    await f.analysisRequests[1].respond({ code: "FIXTURE_UNAVAILABLE", message: "Synthetic failure" }, 503);
    await f.analysis.getByRole("alert").filter({ hasText: "The analysis could not be run" }).waitFor();
    assert.equal(await next.isDisabled(), true);
    await f.analysis.getByRole("button", { name: "Try again", exact: true }).click();
    await until(() => f.analysisRequests.length === 3, "Retry request");
    await f.analysisRequests[2].respond({ data: { columns: {} } });
    await f.analysis.getByText("No data for this combination", { exact: true }).waitFor();
    assert.equal(await next.isDisabled(), true);

    await f.analysis.getByRole("button", { name: "Run preview again", exact: true }).click();
    await until(() => f.analysisRequests.length === 4, "Request before selection change");
    await f.analysis.getByRole("spinbutton", { name: "Limit", exact: true }).fill("11");
    await f.analysis.getByRole("button", { name: "Preview", exact: true }).click();
    await until(() => f.analysisRequests.length === 5, "Request for changed selection");
    assert.equal(f.analysisRequests[4].body.analyticsTechniqueParams[0].value, "11");
    assert.equal(f.analysisRequests[4].body.indicatorQuery.userQueryCondition, "ONLY_ME");
    await f.analysisRequests[4].respond({ data: { columns: columns("Current result") } });
    await f.analysis.getByRole("cell", { name: "Current result", exact: true }).waitFor();
    const staleResponse = f.page.waitForResponse((response) => response.url().endsWith("/basic/analyze"));
    await f.analysisRequests[3].respond({ data: { columns: columns("Stale result") } });
    await (await staleResponse).finished();
    await f.page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
    assert.equal(await f.analysis.getByRole("cell", { name: "Stale result", exact: true }).count(), 0);
    assert.equal(await f.analysis.getByRole("cell", { name: "Current result", exact: true }).isVisible(), true);
    assert.equal(await next.isEnabled(), true);
    await next.click();
    assert.equal(await f.page.getByRole("region", { name: "Visualization step", exact: true }).getAttribute("aria-disabled"), null);
    assert.deepEqual(f.failures, []);
    console.log("PASS: empty/success reruns, loading/error recovery, real-row Next guard and stale analysis response");
  } finally { await f.context.close(); }
}

async function emptyVisualization(browser) {
  const f = await fixture(browser, session(columns(), true));
  try {
    const visualization = f.page.getByRole("region", { name: "Visualization step", exact: true });
    await visualization.getByText("Almost there", { exact: true }).waitFor();
    await f.page.waitForLoadState("networkidle");
    assert.equal(await visualization.getByRole("button", { name: "Save Indicator", exact: true }).isDisabled(), true);
    assert.equal(await visualization.getByText("Live preview", { exact: true }).count(), 0);
    assert.equal(f.chartRequests.length, 0);
    assert.deepEqual(f.failures, []);
    console.log("PASS: previously unlocked visualization stays unready for a keyed zero-row analysis");
  } finally { await f.context.close(); }
}

async function chartInvalidation(browser) {
  const f = await fixture(browser, session(columns("Original result"), true));
  try {
    const visualization = f.page.getByRole("region", { name: "Visualization step", exact: true });
    await until(() => f.chartRequests.length > 0, "Initial chart request");
    await f.analysis.getByRole("button", { name: "Run preview again", exact: true }).click();
    await until(() => f.analysisRequests.length === 1, "Analysis invalidates pending chart");
    const oldCount = f.chartRequests.length;
    const chartResponse = (text) => ({ data: encodeURIComponent(`<div>${text}</div><script>/* Synthetic chart. */</script>`) });
    for (const request of f.chartRequests) await request.respond(chartResponse("Stale chart"));
    await f.analysisRequests[0].respond({ data: { columns: columns() } });
    await f.analysis.getByText("No data for this combination", { exact: true }).waitFor();
    assert.equal(await visualization.getByRole("button", { name: "Save Indicator", exact: true }).isDisabled(), true);
    assert.equal(await visualization.getByText("Stale chart", { exact: true }).count(), 0);

    await f.analysis.getByRole("button", { name: "Run preview again", exact: true }).click();
    await until(() => f.analysisRequests.length === 2, "Analysis rerun after empty result");
    await f.analysisRequests[1].respond({ data: { columns: columns("New result") } });
    await until(() => f.chartRequests.length > oldCount, "Fresh chart for new analysis with unchanged row count");
    await f.page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
    for (const request of f.chartRequests.slice(oldCount)) await request.respond(chartResponse("Fresh chart"));
    await visualization.getByText("Fresh chart", { exact: true }).waitFor();
    assert.equal(await visualization.getByText("Stale chart", { exact: true }).count(), 0);
    assert.equal(await visualization.getByRole("button", { name: "Save Indicator", exact: true }).isEnabled(), true);
    assert.deepEqual(f.failures, []);
    console.log("PASS: analysis invalidates pending chart output and a rerun refreshes chart readiness");
  } finally { await f.context.close(); }
}

(async () => {
  const browser = await webkit.launch({ headless: true,
    ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) });
  try { await recovery(browser); await emptyVisualization(browser); await chartInvalidation(browser); }
  finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
