// Start Vite with VITE_BACKEND_URL=/api/ and Playwright/WebKit on Node's module path:
// OPENLAP_TEST_BASE_URL=http://127.0.0.1:5181 npm run test:analysis-preview
// All API responses and identities below are synthetic; off-origin requests fail.
const { webkit } = require("playwright");
const assert = require("node:assert/strict");
const chartRendererFixture = require("./chart-renderer-fixture.cjs");
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
const alternateMethod = { id: "other-method", name: "Other method", description: "Synthetic alternative analysis" };
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
        actionList: [action], selectedActionList: [action],
        activityList: [activity], selectedActivityList: [activity] }],
    },
    analysis: {
      analyticsMethodList: [method, alternateMethod], inputs: [{ ...input, selectedInput: output }],
      params: [{ id: "limit", title: "Limit", type: "Textbox", dataType: "INTEGER", required: true, defaultValue: 10, value: 10 }],
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

async function fixture(browser, saved, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  // Development HMR must not replace modules during a synthetic scenario.
  await context.routeWebSocket(/.*/, (socket) => socket.close());
  const failures = [], analysisRequests = [], chartRequests = [];
  const methodCatalogRequests = [], methodContractRequests = [];
  const token = "e30." + Buffer.from(JSON.stringify({ sub: "fixture@localhost", roles: ["ROLE_USER"],
    exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url") + ".fixture";
  await context.addInitScript(({ token, saved }) => {
    localStorage.setItem("authTokens", JSON.stringify({ access_token: token, refresh_token: token }));
    sessionStorage.setItem("session_indicator", JSON.stringify(saved));
  }, { token, saved });
  const chartRendererRoute = chartRendererFixture(base, { runtimeDelayMs: options.runtimeDelayMs || 0 });
  await context.route("**/*", async (route) => {
    const request = route.request(), url = new URL(request.url());
    if (inertAssets.has(url.href)) return route.fulfill({
      contentType: url.pathname.endsWith(".css") ? "text/css" : "application/javascript", body: "/* Isolated UI fixture. */",
    });
    if (url.origin !== base.origin) {
      failures.push("Off-origin request: " + url.origin);
      return route.abort();
    }
    if (await chartRendererRoute(route)) return;
    if (!url.pathname.startsWith("/api/")) return route.continue();
    const path = url.pathname.slice(5);
    const send = (data, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
    if ((path === "v1/analytics/methods" && options.holdMethods) ||
        (path.startsWith("v1/analytics/methods/input-params/") && options.holdContracts)) {
      const queue = path === "v1/analytics/methods" ? methodCatalogRequests : methodContractRequests;
      return new Promise((resolve) => queue.push({ path, completed: false,
        respond: async function (data) {
          try { await send({ data }); } finally { this.completed = true; resolve(); }
        } }));
    }
    if (path === "v1/indicators/basic/analyze" || path === "v1/indicators/basic/preview") {
      const queue = path.endsWith("analyze") ? analysisRequests : chartRequests;
      return new Promise((resolve) => queue.push({ body: request.postDataJSON(), completed: false,
        respond: async function (data, status = 200) {
          try { await send(data, status); } finally { this.completed = true; resolve(); }
        } }));
    }
    const responses = {
      "v1/users/my/lrs": [source], "v1/users/my": { name: "Fixture user", email: "fixture@localhost", roles: ["ROLE_USER"] },
      "v1/analytics/methods": [method, alternateMethod],
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
  return { context, page, analysis, analysisRequests, chartRequests, methodCatalogRequests, methodContractRequests, failures };
}

async function recovery(browser) {
  const f = await fixture(browser, session(columns()));
  try {
    const next = f.analysis.getByRole("button", { name: "Next", exact: true });
    await until(() => f.analysisRequests.length === 1, "Preselected valid inputs and parameters automatically request the first preview");
    await f.analysis.getByText("Running analysis…", { exact: true }).first().waitFor();
    assert.equal(await f.analysis.getByRole("button", { name: "Running analysis…", exact: true }).isDisabled(), true);
    assert.equal(await next.isDisabled(), true);
    assert.equal(await f.analysis.getByText("No data for this combination", { exact: true }).count(), 0);
    await f.analysisRequests[0].respond({ data: { columns: columns("Fixture result") } });
    await f.analysis.getByRole("cell", { name: "Fixture result", exact: true }).waitFor();
    assert.equal(await next.isEnabled(), true);
    await f.page.waitForTimeout(700);
    assert.equal(f.analysisRequests.length, 1, "Successful automatic preview does not loop");

    await f.analysis.getByRole("button", { name: "Run preview again", exact: true }).click();
    await until(() => f.analysisRequests.length === 2, "Rerun request");
    assert.equal(await f.analysis.getByRole("cell", { name: "Fixture result", exact: true }).count(), 0);
    assert.equal(await next.isDisabled(), true);
    await f.analysisRequests[1].respond({ code: "FIXTURE_UNAVAILABLE", message: "Synthetic failure" }, 503);
    await f.analysis.getByRole("alert").filter({ hasText: "The analysis could not be run" }).waitFor();
    assert.equal(await next.isDisabled(), true);
    await f.page.waitForTimeout(700);
    assert.equal(f.analysisRequests.length, 2, "A failed automatic preview waits for an edit or explicit retry");
    await f.analysis.getByRole("button", { name: "Try again", exact: true }).click();
    await until(() => f.analysisRequests.length === 3, "Retry request");
    await f.analysisRequests[2].respond({ data: { columns: {} } });
    await f.analysis.getByText("No data for this combination", { exact: true }).waitFor();
    assert.equal(await next.isDisabled(), true);

    await f.analysis.getByRole("button", { name: "Run preview again", exact: true }).click();
    await until(() => f.analysisRequests.length === 4, "Request before selection change");
    await f.analysis.getByRole("spinbutton", { name: "Limit", exact: true }).fill("11");
    await until(() => f.analysisRequests.length === 5, "Changing a valid parameter automatically requests a new preview");
    assert.equal(f.analysisRequests[4].body.analyticsTechniqueParams[0].value, "11");
    assert.equal(f.analysisRequests[4].body.indicatorQuery.userQueryCondition, "ONLY_ME");
    await f.analysisRequests[4].respond({ data: { columns: columns("Current result") } });
    await f.analysis.getByRole("cell", { name: "Current result", exact: true }).waitFor();
    await f.analysisRequests[3].respond({ data: { columns: columns("Stale result") } });
    await f.page.waitForTimeout(100);
    await f.page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
    assert.equal(await f.analysis.getByRole("cell", { name: "Stale result", exact: true }).count(), 0);
    assert.equal(await f.analysis.getByRole("cell", { name: "Current result", exact: true }).isVisible(), true);
    assert.equal(await next.isEnabled(), true);
    await next.click();
    assert.equal(await f.page.getByRole("region", { name: "Visualization step", exact: true }).getAttribute("aria-disabled"), null);
    assert.deepEqual(f.failures, []);
    console.log("PASS: automatic preselected preview, empty/success refreshes, failure without retry loops, explicit retry and stale-response protection");
  } finally { await f.context.close(); }
}

async function incompleteInputs(browser) {
  const saved = session({});
  const missing = { id: "users", title: "Users", type: "Text", required: true };
  saved.analysis.inputs.push(missing);
  const f = await fixture(browser, saved);
  try {
    await f.page.waitForTimeout(700);
    assert.equal(f.analysisRequests.length, 0, "A mapped optional/other input cannot substitute for an unmapped required input");
    assert.equal(await f.analysis.getByRole("button", { name: "Next", exact: true }).isDisabled(), true);
    await f.analysis.getByRole("region", { name: "Method inputs", exact: true }).getByRole("combobox").nth(1).click();
    await f.page.getByRole("option").filter({ hasText: "Users (account name)" }).click();
    await until(() => f.analysisRequests.length === 1, "Completing the final required input starts the preview automatically");
    assert.equal(f.analysisRequests[0].body.analyticsTechniqueMapping.mapping.length, 2);
    await f.analysisRequests[0].respond({ data: { columns: columns("Required inputs ready") } });
    await f.analysis.getByRole("cell", { name: "Required inputs ready", exact: true }).waitFor();
    assert.deepEqual(f.failures, []);
    console.log("PASS: every required method input must be mapped before automatic execution");
  } finally { await f.context.close(); }
}

async function parameterGating(browser) {
  const saved = session({});
  saved.analysis.params[0].value = "";
  const f = await fixture(browser, saved);
  try {
    const limit = f.analysis.getByRole("spinbutton", { name: "Limit", exact: true });
    const next = f.analysis.getByRole("button", { name: "Next", exact: true });
    await f.page.waitForTimeout(700);
    assert.equal(f.analysisRequests.length, 0, "An empty required parameter waits for user input");
    await limit.fill("10.5");
    await f.page.waitForTimeout(700);
    assert.equal(f.analysisRequests.length, 0, "Fractional integer parameters do not execute automatically");
    await limit.fill("11");
    await until(() => f.analysisRequests.length === 1, "Completing a valid required parameter automatically executes analysis");
    assert.equal(f.analysisRequests[0].body.analyticsTechniqueParams[0].value, "11");
    await f.analysisRequests[0].respond({ data: { columns: columns("Valid integer") } });
    await f.analysis.getByRole("cell", { name: "Valid integer", exact: true }).waitFor();
    await limit.fill("");
    assert.equal(await next.isDisabled(), true, "Clearing a parameter immediately invalidates the old result");
    await f.page.waitForTimeout(700);
    assert.equal(f.analysisRequests.length, 1);
    assert.equal(await f.analysis.getByRole("cell", { name: "Valid integer", exact: true }).count(), 0);
    await limit.fill("12");
    await until(() => f.analysisRequests.length === 2, "First rapid-edit request starts");
    await limit.fill("13");
    await limit.fill("14");
    await until(() => f.analysisRequests.length === 3, "The settled rapid edit starts one replacement request");
    assert.equal(f.analysisRequests[2].body.analyticsTechniqueParams[0].value, "14");
    await f.analysisRequests[2].respond({ data: { columns: columns("Latest settled value") } });
    await f.analysis.getByRole("cell", { name: "Latest settled value", exact: true }).waitFor();
    await f.analysisRequests[1].respond({ data: { columns: columns("Obsolete integer") } });
    await f.page.waitForTimeout(700);
    assert.equal(f.analysisRequests.length, 3, "Intermediate keystrokes are coalesced without a request loop");
    assert.equal(await f.analysis.getByRole("cell", { name: "Obsolete integer", exact: true }).count(), 0);
    assert.equal(await next.isEnabled(), true);
    assert.deepEqual(f.failures, []);
    console.log("PASS: required/numeric parameter gating, debounce and obsolete-response protection");
  } finally { await f.context.close(); }
}

async function filterChanges(browser) {
  const saved = session({});
  saved.filters.selectedActivities[0].selectedActivityList = [];
  saved.lockedStep.filters.openPanel = true;
  const f = await fixture(browser, saved);
  try {
    const filters = f.page.getByRole("region", { name: "Filters step", exact: true });
    await f.page.waitForTimeout(700);
    assert.equal(f.analysisRequests.length, 0, "An empty activity selection cannot execute analysis");
    await filters.getByRole("combobox", { name: "Activities", exact: true }).click();
    await f.page.getByRole("option", { name: "Fixture activity", exact: true }).click();
    await f.page.keyboard.press("Escape");
    await until(() => f.analysisRequests.length === 1, "Completing the activity selection starts analysis automatically");
    assert.deepEqual(f.analysisRequests[0].body.indicatorQuery.activities[output.id], [activity.id]);
    await f.analysisRequests[0].respond({ data: { columns: columns("Only me") } });
    await f.analysis.getByRole("cell", { name: "Only me", exact: true }).waitFor();
    await filters.getByRole("radio", { name: "Use data of all users", exact: true }).check();
    assert.equal(await f.analysis.getByRole("button", { name: "Next", exact: true }).isDisabled(), true);
    await until(() => f.analysisRequests.length === 2, "A filter-query change automatically refreshes the output data");
    assert.equal(f.analysisRequests[1].body.indicatorQuery.userQueryCondition, "INCLUDE_ME");
    await f.analysisRequests[1].respond({ data: { columns: columns("All users") } });
    await f.analysis.getByRole("cell", { name: "All users", exact: true }).waitFor();
    assert.deepEqual(f.failures, []);
    console.log("PASS: incomplete activity selection waits and filter-query changes refresh automatically");
  } finally { await f.context.close(); }
}

async function catalogAndMethodRaces(browser) {
  const late = await fixture(browser, session({}), { holdMethods: true });
  try {
    await until(() => late.methodCatalogRequests.length === 1 && late.analysisRequests.length === 1,
      "Preselected inputs can execute while the method catalog is loading");
    await late.analysisRequests[0].respond({ data: { columns: columns("Fresh data before catalog") } });
    await late.analysis.getByRole("cell", { name: "Fresh data before catalog", exact: true }).waitFor();
    await late.methodCatalogRequests[0].respond([method, alternateMethod]);
    await late.page.waitForTimeout(700);
    assert.equal(await late.analysis.getByRole("cell", { name: "Fresh data before catalog", exact: true }).count(), 1,
      "A late method-list response cannot clear a successful automatic preview");
    assert.equal(late.analysisRequests.length, 1, "Loading the method list does not repeat a completed analysis");
    assert.deepEqual(late.failures, []);
  } finally { await late.context.close(); }

  const saved = session({});
  saved.analysis.inputs = [];
  saved.analysis.params = [];
  saved.analysis.selectedAnalyticsMethod = { method: { id: "", name: "" }, mapping: { mapping: [] } };
  const f = await fixture(browser, saved, { holdContracts: true });
  try {
    const choose = async (name) => {
      await f.analysis.getByRole("combobox", { name: "Analytics method", exact: true }).click();
      await f.page.getByRole("option", { name: new RegExp("^" + name) }).click();
    };
    await choose("Other method");
    await until(() => f.methodContractRequests.length === 1, "First method contract starts");
    await choose("Fixture method");
    await until(() => f.methodContractRequests.length === 2, "Replacement method contract starts");
    assert.ok(f.methodContractRequests[1].path.endsWith("fixture-method"));
    await f.methodContractRequests[1].respond({ inputs: [input], params: saved.analysis.params });
    await f.analysis.getByRole("region", { name: "Method inputs", exact: true }).getByRole("combobox").click();
    await f.page.getByRole("option").filter({ hasText: /^Activities$/ }).click();
    await until(() => f.analysisRequests.length === 1, "Current method inputs execute automatically when completed");
    assert.equal(f.analysisRequests[0].body.analyticsTechniqueId, method.id);
    await f.analysisRequests[0].respond({ data: { columns: columns("Current method result") } });
    await f.analysis.getByRole("cell", { name: "Current method result", exact: true }).waitFor();
    await f.methodContractRequests[0].respond({ inputs: [{ ...input, id: "obsolete", title: "Obsolete input" }], params: [] });
    await f.page.waitForTimeout(700);
    assert.equal(await f.analysis.getByText("Obsolete input (Required)", { exact: true }).count(), 0,
      "A superseded method's late contract cannot replace the current method inputs");
    assert.equal(await f.analysis.getByRole("cell", { name: "Current method result", exact: true }).count(), 1);
    assert.equal(f.analysisRequests.length, 1, "Obsolete metadata cannot invalidate or rerun the current result");
    assert.deepEqual(f.failures, []);
    console.log("PASS: late method catalogs preserve preview data and superseded method contracts are ignored");
  } finally { await f.context.close(); }
}

async function emptyVisualization(browser) {
  const f = await fixture(browser, session(columns(), true));
  try {
    const visualization = f.page.getByRole("region", { name: "Visualization step", exact: true });
    await until(() => f.analysisRequests.length === 1, "An unlocked visualization also refreshes its source analysis automatically");
    await f.analysisRequests[0].respond({ data: { columns: columns() } });
    await visualization.getByText("Almost there", { exact: true }).waitFor();
    assert.equal(await visualization.getByRole("button", { name: "Save Indicator", exact: true }).isDisabled(), true);
    assert.equal(await visualization.getByText("Live preview", { exact: true }).count(), 0);
    assert.equal(f.chartRequests.length, 0);
    assert.deepEqual(f.failures, []);
    console.log("PASS: previously unlocked visualization stays unready for a keyed zero-row analysis");
  } finally { await f.context.close(); }
}

async function chartInvalidation(browser) {
  const f = await fixture(browser, session(columns("Original result"), true), { runtimeDelayMs: 200 });
  try {
    const visualization = f.page.getByRole("region", { name: "Visualization step", exact: true });
    await until(() => f.analysisRequests.length === 1, "Automatic analysis invalidates cached chart output on reopening");
    const oldCount = f.chartRequests.length;
    const chartResponse = (text) => ({ data: encodeURIComponent(`<div>${text}</div><script>/* Synthetic chart. */</script>`) });
    for (const request of f.chartRequests) await request.respond(chartResponse("Stale chart"));
    await f.analysisRequests[0].respond({ data: { columns: columns() } });
    await f.analysis.getByText("No data for this combination", { exact: true }).waitFor();
    assert.equal(await visualization.getByRole("button", { name: "Save Indicator", exact: true }).isDisabled(), true);
    assert.equal(await visualization.locator("iframe").count(), 0);

    await f.analysis.getByRole("button", { name: "Run preview again", exact: true }).click();
    await until(() => f.analysisRequests.length === 2, "Analysis rerun after empty result");
    await f.analysisRequests[1].respond({ data: { columns: columns("New result") } });
    await until(() => f.chartRequests.length > oldCount, "Fresh chart for new analysis with unchanged row count");
    await f.page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
    for (const request of f.chartRequests.slice(oldCount)) await request.respond(chartResponse("Fresh chart"));
    assert.equal(await visualization.getByRole("button", { name: "Save Indicator", exact: true }).isDisabled(), true,
      "Receiving chart code does not enable Save before the renderer acknowledges readiness");
    const rendered = visualization.frameLocator('iframe[title="OpenLAP chart preview"]');
    await rendered.getByText("Fresh chart", { exact: true }).waitFor();
    await visualization.locator('iframe[aria-busy="false"]').waitFor();
    await f.page.waitForFunction(() => [...document.querySelectorAll("button")].some((element) => element.textContent === "Save Indicator" && !element.disabled));
    assert.equal(await rendered.getByText("Stale chart", { exact: true }).count(), 0);
    assert.equal(await visualization.getByRole("button", { name: "Save Indicator", exact: true }).isEnabled(), true);
    assert.deepEqual(f.failures, []);
    console.log("PASS: analysis invalidates pending chart output and a rerun refreshes chart readiness");
  } finally { await f.context.close(); }
}

(async () => {
  const browser = await webkit.launch({ headless: true,
    ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) });
  try {
    await recovery(browser);
    await incompleteInputs(browser);
    await parameterGating(browser);
    await filterChanges(browser);
    await catalogAndMethodRaces(browser);
    await emptyVisualization(browser);
    await chartInvalidation(browser);
  }
  finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
