// Start Vite with VITE_BACKEND_URL=/api/ and Playwright/WebKit on Node's module path:
// OPENLAP_TEST_BASE_URL=http://127.0.0.1:5181 npm run test:analysis-preview
// All API responses and identities below are synthetic; off-origin requests fail.
const { webkit } = require("playwright");
const assert = require("node:assert/strict");
const chartRendererFixture = require("./chart-renderer-fixture.cjs");
const editorNavigation = require("./editor-navigation-assertions.cjs");
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

const column = (id, type, data, title = id) => ({ configurationData: { id, title, type }, data });
const columns = (label) => ({
  item_name: column("item_name", "Text", label === undefined ? [] : [label]),
  item_count: column("item_count", "Numeric", label === undefined ? [] : [0]),
});
const input = { id: "items", title: "Items", type: "Text", required: true };
const output = { id: "statement.object.definition.name.en-US", type: "Text", name: "Activities" };
const activityIdOutput = { id: "statement.object.id", type: "Text", name: "Activity identifier" };
const method = { id: "fixture-method", name: "Fixture method", description: "Synthetic analysis" };
const alternateMethod = { id: "other-method", name: "Other method", description: "Synthetic alternative analysis" };
const countEventsMethod = { id: "fixture-event-count", name: "Count selected events", description: "Counts every selected event once.", recommendedFor: ["BASIC"],
  metadata: { inputRoles: { event: "EVENTS" } } };
const categoryMethod = { id: "fixture-event-frequency", name: "Count events by category", metadata: {
  inputRoles: { category: "CATEGORY" }, outputHints: {
    percentage: { format: "PERCENTAGE" },
    excluded_count: { diagnostic: { kind: "EXCLUDED", aggregation: "ONCE", input: "category", summaryOnly: true } },
  },
} };
const categoryInput = { id: "category", title: "Event category", type: "Text", required: true };
const distinctMethod = { id: "fixture-distinct-count", name: "Count distinct values", metadata: {
  inputRoles: { value: "CATEGORY", group: "CATEGORY" }, outputHints: {
    excluded_count: { diagnostic: { kind: "EXCLUDED", aggregation: "SUM", input: "value", summaryOnly: true } },
    ungrouped_count: { diagnostic: { kind: "UNGROUPED", aggregation: "ONCE", input: "group", summaryOnly: true } },
  },
} };
const multiMethod = { id: "fixture-correlation", name: "Pearson correlation", recommendedFor: ["MULTI_LEVEL"] };
const sharedMethod = { id: "fixture-summary", name: "Summarize numeric values", recommendedFor: ["BASIC", "MULTI_LEVEL"] };
const groupedScoreMethod = { id: "fixture-grouped-summary", name: "Summarize numeric values by group",
  recommendedFor: ["BASIC"], basicInputRequirement: "SCORE_AND_CATEGORY", metadata: {
    inputRoles: { values: "SCORE", group: "CATEGORY" }, outputHints: {
      count: { diagnostic: { kind: "INCLUDED", aggregation: "SUM" } },
      excluded_count: { diagnostic: { kind: "EXCLUDED", aggregation: "SUM" } },
      ungrouped_count: { diagnostic: { kind: "UNGROUPED", aggregation: "ONCE" } },
    },
  } };
const scoreInput = { id: "values", title: "Numeric measurement", type: "Numeric", required: true };
const rawScore = "statement.result.score.raw";
const inputAvailability = (availableFields) => ({
  checkedStatements: 3, complete: true, availableFields, invalidFields: [], scoreCategoryPairs: [],
});
const distinctValueInput = { id: "value", title: "Values to count", type: "Text", required: true };
const distinctGroupInput = { id: "group", title: "Group (optional)", type: "Text", required: false };
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
  const { serializeBasicDraft } = await import("../src/pages/indicators/indicator-editor/basic-indicator/utils/basic-draft-model.js");
  saved = structuredClone(saved);
  saved.indicator.indicatorName = "Fixture working draft";
  const configuration = serializeBasicDraft(saved);
  if (options.legacyAnalysisMapping) {
    configuration.analysis.selectedAnalyticsMethod.mapping.mapping = options.legacyAnalysisMapping;
  }
  const draft = { id: "fixture-basic-draft", indicatorType: "BASIC", schemaVersion: 1,
    name: saved.indicator.indicatorName, configuration, revision: 0,
    status: "DRAFT", recoverable: true, createdAt: "2026-11-15T10:00:00Z", updatedAt: "2026-11-15T10:00:00Z" };
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, locale: "en-US" });
  // Development HMR must not replace modules during a synthetic scenario.
  await context.routeWebSocket(/.*/, (socket) => socket.close());
  const failures = [], analysisRequests = [], chartRequests = [], draftRequests = [];
  const methodCatalogRequests = [], methodContractRequests = [], availabilityRequests = [];
  const activeMethod = saved.analysis.selectedAnalyticsMethod.method;
  const methodCatalog = [activeMethod.id === method.id ? activeMethod : method,
    sharedMethod, alternateMethod, countEventsMethod, categoryMethod, multiMethod, distinctMethod];
  if (options.holdAvailability) {
    methodCatalog[1] = { ...sharedMethod, basicInputRequirement: "SCORE" };
    methodCatalog.push(groupedScoreMethod);
  }
  let methodCatalogCount = 0;
  const token = "e30." + Buffer.from(JSON.stringify({ sub: "fixture@localhost", roles: ["ROLE_USER"],
    exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url") + ".fixture";
  await context.addInitScript(({ token }) => {
    localStorage.setItem("authTokens", JSON.stringify({ access_token: token, refresh_token: token }));
  }, { token });
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
    if (path === `v1/indicators/drafts/${draft.id}`) {
      if (request.method() === "GET") return send({ data: draft });
      if (request.method() === "PUT") {
        const body = request.postDataJSON();
        draftRequests.push(body);
        if (body.revision !== draft.revision) return send({ message: "Fixture draft revision changed" }, 409);
        Object.assign(draft, body, { revision: draft.revision + 1, updatedAt: new Date().toISOString() });
        return send({ data: draft });
      }
    }
    if (path === "v1/indicators/basic/input-availability") {
      const body = request.postDataJSON();
      if (!options.holdAvailability) return send({ data: inputAvailability([output.id]) });
      return new Promise((resolve) => availabilityRequests.push({ body,
        respond: async function (data) {
          try { await send({ data }); } finally { resolve(); }
        } }));
    }
    if (path === "v1/analytics/methods") methodCatalogCount += 1;
    // Resume first refreshes referenced metadata authoritatively. Hold only the
    // mounted method picker's subsequent catalog request for the existing race.
    if ((path === "v1/analytics/methods" && options.holdMethods && methodCatalogCount > 1) ||
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
      "v1/analytics/methods": methodCatalog,
      "v1/analytics/methods/input-params/fixture-event-count": {
        inputs: [{ id: "event", title: "Selected events", type: "Text", required: true }], params: [],
      },
      "v1/analytics/methods/input-params/fixture-event-frequency": { inputs: [categoryInput], params: [] },
      "v1/analytics/methods/input-params/fixture-distinct-count": { inputs: [distinctValueInput, distinctGroupInput], params: [] },
      "v1/analytics/methods/input-params/fixture-summary": { inputs: [scoreInput], params: [] },
      "v1/analytics/methods/input-params/fixture-method": {
        inputs: saved.analysis.inputs.map(({ selectedInput: _selectedInput, ...port }) => port),
        params: saved.analysis.params,
      },
      "v1/visualizations/libraries": [library],
      "v1/visualizations/libraries/fixture-library/types": [chart],
      "v1/statements/activity-types": [activityType],
      "v1/statements/actions": [action],
      "v1/statements/activities": [activity],
    };
    if (!(path in responses)) failures.push("Unexpected API request: " + path);
    await send({ data: responses[path] ?? {}, message: "Synthetic fixture" });
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => {
    failures.push(error.message);
    console.error("Browser error:", error.stack);
  });
  await page.goto(new URL(`/indicator/editor/drafts/${draft.id}`, base).href);
  const analysis = page.getByRole("region", { name: "Analysis step", exact: true });
  await analysis.getByRole("button", { name: "Next", exact: true }).waitFor();
  return { context, page, analysis, analysisRequests, chartRequests, draftRequests, draft, methodCatalogRequests, methodContractRequests, availabilityRequests, failures };
}

async function navigation(browser) {
  const f = await fixture(browser, session(columns()));
  try {
    await until(() => f.analysisRequests.length === 1, "Navigation fixture's initial analysis starts");
    await f.analysisRequests[0].respond({ data: { columns: columns("Navigation result") } });
    await f.analysis.getByRole("cell", { name: "Navigation result", exact: true }).waitFor();
    await editorNavigation.chooseStep(f.page, "Dataset", "dataset");
    assert.equal(await f.page.getByPlaceholder("Search for Learning Record Stores (LRS)", { exact: true }).isVisible(), true);
    await editorNavigation.chooseStep(f.page, "Filters", "filters");
    assert.equal(await f.page.getByRole("radio", { name: "Use only my data", exact: true }).isChecked(), true);
    await editorNavigation.chooseStep(f.page, "Analysis", "analysis");
    assert.equal(await f.analysis.getByRole("combobox", { name: "Analytics method", exact: true }).inputValue(), "Fixture method");
    await f.page.getByRole("status").filter({ hasText: /^Draft saved/ }).waitFor();
    await f.page.waitForTimeout(1100);
    const configuration = structuredClone(f.draft.configuration), writes = f.draftRequests.length;
    await editorNavigation.scrollToStep(f.page, "filters");
    await editorNavigation.assertCurrent(f.page, "Filters");
    await f.page.waitForTimeout(1100);
    assert.equal(f.draftRequests.length, writes, "Scroll-only orientation does not autosave a Basic draft");
    assert.deepEqual(f.draft.configuration, configuration, "Scroll-only orientation leaves the Basic configuration unchanged");
    assert.equal(f.analysisRequests.length, 1, "Navigation does not rerun an unchanged Basic analysis");
    assert.equal(f.chartRequests.length, 0, "Navigation does not execute an unselected chart");
    await editorNavigation.assertNoOverflow(f.page);
    assert.deepEqual(f.failures, []);
    console.log("PASS: real Basic navigation opens/focuses retained sections; scrolling changes orientation without autosaving or executing previews");
  } finally { await f.context.close(); }
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
    await f.analysis.getByRole("alert").filter({ hasText: "Synthetic failure" }).waitFor();
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
  const missing = { id: "group", title: "Group", type: "Text", required: true };
  saved.analysis.inputs.push(missing);
  const f = await fixture(browser, saved);
  try {
    await f.page.waitForTimeout(700);
    assert.equal(f.analysisRequests.length, 0, "A mapped optional/other input cannot substitute for an unmapped required input");
    assert.equal(await f.analysis.getByRole("button", { name: "Next", exact: true }).isDisabled(), true);
    await f.analysis.getByRole("region", { name: "Method inputs", exact: true }).getByRole("combobox").nth(1).click();
    await f.page.getByRole("option", { name: "Activity identifier", exact: true }).click();
    await until(() => f.analysisRequests.length === 1, "Completing the final required input starts the preview automatically");
    assert.equal(f.analysisRequests[0].body.analyticsTechniqueMapping.mapping.length, 2);
    await f.analysisRequests[0].respond({ data: { columns: columns("Required inputs ready") } });
    await f.analysis.getByRole("cell", { name: "Required inputs ready", exact: true }).waitFor();
    assert.deepEqual(f.failures, []);
    console.log("PASS: every required method input must be mapped before automatic execution");
  } finally { await f.context.close(); }
}

async function numericInputs(browser) {
  const saved = session({});
  const values = { id: "values", title: "Values", type: "Numeric", required: true,
    description: "The numerical measurements to summarise." };
  const group = { id: "group", title: "Group", type: "Text", required: false };
  saved.analysis.inputs = [values, group];
  saved.analysis.params = [];
  saved.analysis.selectedAnalyticsMethod.method = { ...method, metadata: {
    inputRoles: { values: "SCORE", group: "CATEGORY" },
    outputHints: {
      count: { diagnostic: { kind: "INCLUDED", aggregation: "SUM" } },
      excluded_count: { diagnostic: { kind: "EXCLUDED", aggregation: "SUM" } },
      ungrouped_count: { diagnostic: { kind: "UNGROUPED", aggregation: "ONCE" } },
    },
  } };
  saved.analysis.selectedAnalyticsMethod.mapping.mapping = [];
  const f = await fixture(browser, saved);
  try {
    await f.page.waitForTimeout(700);
    assert.equal(f.analysisRequests.length, 0, "Numerical methods wait for the required measurement");
    const inputs = f.analysis.getByRole("region", { name: "Method inputs", exact: true });
    await inputs.getByRole("combobox").first().click();
    assert.equal(await f.page.getByRole("option", { name: "Raw score", exact: true }).count(), 1);
    assert.equal(await f.page.getByRole("option", { name: "Activities", exact: true }).count(), 0,
      "Categorical activity labels are not offered as numerical observations");
    await f.page.getByRole("option", { name: "Raw score", exact: true }).click();
    const scorePath = inputs.getByText("result.score.raw", { exact: true });
    await scorePath.waitFor();
    await until(() => f.analysisRequests.length === 1, "Selecting the required numeric field automatically previews");
    const mapping = f.analysisRequests[0].body.analyticsTechniqueMapping.mapping;
    assert.equal(mapping[0].outputPort.id, "statement.result.score.raw");
    assert.equal(mapping[0].outputPort.type, "Numeric");
    await f.analysisRequests[0].respond({ data: { columns: {
      group: column("group", "Text", ["All observations"]),
      count: column("count", "Numeric", [1]),
      excluded_count: column("excluded_count", "Numeric", [2]),
      mean: column("mean", "Numeric", [7.5]),
      standard_deviation: column("standard_deviation", "Numeric", [null]),
    } } });
    await f.analysis.getByRole("status").filter({ hasText: "1 observation analysed. 2 incomplete observations excluded." }).waitFor();
    assert.equal(await f.analysis.getByRole("cell", { name: "—", exact: true }).count(), 1,
      "An undefined statistic is not displayed as zero");
    await editorNavigation.assertNoOverflow(f.page);
    await inputs.getByRole("combobox").nth(1).click();
    await f.page.getByRole("option", { name: "Activity identifier", exact: true }).click();
    const groupPath = inputs.getByText("object.id", { exact: true });
    await groupPath.waitFor();
    await until(() => f.analysisRequests.length === 2, "Optional grouping changes automatically refresh");
    assert.equal(f.analysisRequests[1].body.analyticsTechniqueMapping.mapping.length, 2);
    await f.analysisRequests[1].respond({ data: { columns: {
      group: column("group", "Text", ["First group", "Second group"]),
      count: column("count", "Numeric", [2, 1]),
      excluded_count: column("excluded_count", "Numeric", [1, 0]),
      ungrouped_count: column("ungrouped_count", "Numeric", [2, 2]),
      mean: column("mean", "Numeric", [3, 5]),
    } } });
    await f.analysis.getByRole("status").filter({ hasText: "3 observations analysed across 2 groups. 1 incomplete observation excluded. 2 observations skipped because their group was missing." }).waitFor();
    await inputs.getByRole("combobox").nth(1).click();
    await f.page.getByRole("option", { name: "Not used", exact: true }).click();
    await groupPath.waitFor({ state: "hidden" });
    assert.equal(await scorePath.isVisible(), true);
    await until(() => f.analysisRequests.length === 3, "Clearing optional input refreshes without losing numeric mapping");
    assert.equal(f.analysisRequests[2].body.analyticsTechniqueMapping.mapping.length, 1);
    assert.deepEqual(f.analysisRequests[2].body.indicatorQuery.outputs, ["statement.result.score.raw"]);
    await f.analysisRequests[2].respond({ code: "INVALID_ANALYSIS_INPUT", message: "Choose at least three complete observations." }, 400);
    await f.analysis.getByRole("alert").filter({ hasText: "Choose at least three complete observations." }).waitFor();
    assert.equal(await f.analysis.getByRole("cell", { name: "First group", exact: true }).count(), 0);
    assert.equal(await f.analysis.getByRole("button", { name: "Next", exact: true }).isDisabled(), true);
    assert.deepEqual(f.failures, []);
    console.log("PASS: typed numerical fields, visible xAPI paths, automatic preview, optional clearing, observation diagnostics, undefined statistics and actionable errors");
  } finally { await f.context.close(); }
}

async function countEventsDefault(browser) {
  const saved = session({});
  saved.analysis.inputs = [];
  saved.analysis.params = [];
  saved.analysis.selectedAnalyticsMethod = { method: { id: "", name: "" }, mapping: { mapping: [] } };
  const f = await fixture(browser, saved);
  try {
    const methodChoice = f.analysis.getByRole("combobox", { name: "Analytics method", exact: true });
    await methodChoice.click();
    const options = f.page.getByRole("listbox").getByRole("option");
    const expectedOrder = [distinctMethod, categoryMethod, countEventsMethod, method, alternateMethod, multiMethod, sharedMethod];
    await options.first().waitFor();
    assert.equal(await options.count(), expectedOrder.length);
    for (const [index, { name }] of expectedOrder.entries()) {
      assert.equal(await options.nth(index).getByText(name, { exact: true }).count(), 1, `Sorted method at position ${index + 1}`);
    }
    await options.filter({ hasText: countEventsMethod.name }).getByText("Recommended for Basic Indicator", { exact: true }).waitFor();
    await options.filter({ hasText: multiMethod.name }).getByText("Recommended for Multilevel analysis", { exact: true }).waitFor();
    await options.filter({ hasText: sharedMethod.name }).getByText("Recommended for Basic Indicator and Multilevel analysis", { exact: true }).waitFor();
    assert.equal(await options.filter({ hasText: method.name }).getByText(/^Recommended for/).count(), 0);
    await methodChoice.fill("every selected");
    await f.page.getByRole("option", { name: /^Count selected events/ }).click();
    await until(() => f.analysisRequests.length === 1, "Counting selected events previews immediately without an arbitrary field choice");
    assert.equal(f.analysisRequests[0].body.analyticsTechniqueId, countEventsMethod.id);
    assert.deepEqual(f.analysisRequests[0].body.indicatorQuery.outputs, ["statement.id"]);
    const mapping = f.analysisRequests[0].body.analyticsTechniqueMapping.mapping;
    assert.equal(mapping[0].inputPort.id, "event");
    assert.equal(mapping[0].outputPort.type, "Text");
    const inputs = f.analysis.getByRole("region", { name: "Method inputs", exact: true });
    await inputs.getByText("Each xAPI statement matching your filters counts as one event.", { exact: true }).waitFor();
    await inputs.getByText("id", { exact: true }).waitFor();
    assert.equal(await inputs.getByRole("combobox").count(), 0);
    await f.analysisRequests[0].respond({ data: { columns: {
      category: column("category", "Text", ["Selected events"]), event_count: column("event_count", "Numeric", [42]),
    } } });
    await f.analysis.getByRole("cell", { name: "42", exact: true }).waitFor();
    assert.equal(await f.analysis.getByRole("button", { name: "Next", exact: true }).isEnabled(), true);
    await f.page.waitForTimeout(700);
    assert.equal(f.analysisRequests.length, 1, "The hidden default does not cause a preview loop");
    assert.deepEqual(f.failures, []);
    console.log("PASS: count-selected-events contract receives a hidden row mapping and previews automatically");
  } finally { await f.context.close(); }
}

async function dataAwareRecommendations(browser) {
  const saved = session({});
  saved.analysis.inputs = [];
  saved.analysis.params = [];
  saved.analysis.selectedAnalyticsMethod = { method: { id: "", name: "" }, mapping: { mapping: [] } };
  saved.lockedStep.filters.openPanel = true;
  const f = await fixture(browser, saved, { holdAvailability: true });
  try {
    const methodSection = f.analysis.getByRole("region", { name: "Analytics method", exact: true });
    const methodChoice = methodSection.getByRole("combobox", { name: "Analytics method", exact: true });
    const filters = f.page.getByRole("region", { name: "Filters step", exact: true });
    const recommended = "Recommended for this data";
    const missing = "Missing required data";
    const scoreReason = "The checked statements contain numeric values in Raw score (result.score.raw).";
    const missingScoreReason = "Needs a usable numeric score field such as Raw score (result.score.raw).";

    await until(() => f.availabilityRequests.length === 1, "Complete filters trigger one availability check without a selected method");
    const request = f.availabilityRequests[0].body;
    assert.equal(request.userQueryCondition, "ONLY_ME");
    assert.deepEqual(request.activities[output.id], [activity.id]);
    assert.ok(request.outputs.includes(rawScore), "The same filtered statements are checked for raw scores");
    assert.ok(request.outputs.includes(output.id), "Category fields are checked too");
    assert.ok(request.outputs.every((field) => !/\.(actor|authority)(\.|$)/.test(field)),
      "Recommendations never request learner identities");
    await f.availabilityRequests[0].respond(inputAvailability([rawScore, output.id]));
    await methodChoice.click();
    const options = f.page.getByRole("listbox").getByRole("option");
    const scoreOption = options.filter({ has: f.page.getByText(sharedMethod.name, { exact: true }) });
    const groupedOption = options.filter({ has: f.page.getByText(groupedScoreMethod.name, { exact: true }) });
    await scoreOption.getByText(recommended, { exact: true }).waitFor();
    await scoreOption.getByText(scoreReason, { exact: true }).waitFor();
    await groupedOption.getByText(missing, { exact: true }).waitFor();
    await groupedOption.getByText(/numeric score and a category in the same statement/).waitFor();
    await scoreOption.click();
    await methodSection.getByText(scoreReason, { exact: true }).waitFor();

    const inputs = f.analysis.getByRole("region", { name: "Method inputs", exact: true });
    await inputs.getByRole("combobox", { name: "Numeric measurement (Required)", exact: true }).click();
    await f.page.getByRole("option", { name: "Raw score", exact: true }).click();
    await until(() => f.analysisRequests.length === 1, "Mapping the score triggers the separate analysis preview");
    assert.equal(f.analysisRequests[0].body.analyticsTechniqueId, sharedMethod.id);
    await f.analysisRequests[0].respond({ data: { columns: columns("Score summary") } });
    await f.analysis.getByRole("cell", { name: "Score summary", exact: true }).waitFor();
    assert.equal(f.availabilityRequests.length, 1, "Method and input changes do not check the same filters again");

    await filters.getByRole("radio", { name: "Use data of all users", exact: true }).check();
    assert.equal(await methodSection.getByText(recommended, { exact: true }).count(), 0,
      "Changing filters immediately clears the earlier recommendation");
    await until(() => f.availabilityRequests.length === 2, "Changed user scope starts a fresh check");
    assert.equal(f.availabilityRequests[1].body.userQueryCondition, "INCLUDE_ME");
    await filters.getByRole("radio", { name: "Use all except my data", exact: true }).check();
    await until(() => f.availabilityRequests.length === 3, "New scope supersedes the pending check");
    assert.equal(f.availabilityRequests[2].body.userQueryCondition, "EXCLUDE_ME");
    await f.availabilityRequests[2].respond(inputAvailability([output.id]));
    await methodSection.getByText(missing, { exact: true }).waitFor();
    await methodSection.getByText(missingScoreReason, { exact: true }).waitFor();
    await f.availabilityRequests[1].respond(inputAvailability([rawScore, output.id]));
    await f.page.waitForTimeout(400);
    assert.equal(await methodSection.getByText(recommended, { exact: true }).count(), 0,
      "A superseded availability response cannot recommend the old data");
    assert.equal(await methodSection.getByText(missingScoreReason, { exact: true }).isVisible(), true);
    assert.equal(await methodChoice.inputValue(), sharedMethod.name, "The selected method is preserved when its input is missing");
    assert.equal(f.availabilityRequests.length, 3);
    assert.deepEqual(f.failures, []);
    console.log("PASS: recommendations explain usable and missing data, check filters once, and ignore stale responses");
  } finally { await f.context.close(); }
}

async function categoryPreview(browser) {
  const saved = session({});
  saved.analysis.inputs = [{ ...categoryInput, selectedInput: output }];
  saved.analysis.params = [];
  saved.analysis.selectedAnalyticsMethod = { method: categoryMethod,
    mapping: { mapping: [{ inputPort: categoryInput, outputPort: output }] } };
  const f = await fixture(browser, saved);
  try {
    const results = (excluded) => ({ data: { columns: {
      category: column("category", "Text", ["First activity", "Second activity"], "Category"),
      event_count: column("event_count", "Numeric", [1, 2], "Event count"),
      percentage: column("percentage", "Numeric", [100 / 3, 200 / 3], "Percentage of usable events"),
      excluded_count: column("excluded_count", "Numeric", [excluded, excluded], "Events without a category (whole dataset)"),
    } } });
    const excludedColumn = f.analysis.getByRole("columnheader", { name: /Events without a category/ });
    const missingCategoryNote = f.analysis.getByText(/observations were skipped because Activities/);
    await until(() => f.analysisRequests.length === 1, "The mapped category auto-previews");
    assert.equal(f.analysisRequests[0].body.analyticsTechniqueId, categoryMethod.id);
    assert.deepEqual(f.analysisRequests[0].body.indicatorQuery.outputs, [output.id]);
    await f.analysisRequests[0].respond(results(0));
    await f.analysis.getByRole("cell", { name: "33.33%", exact: true }).waitFor();
    assert.equal(await f.analysis.getByRole("cell", { name: "66.67%", exact: true }).count(), 1);
    assert.equal(await excludedColumn.count(), 0);
    assert.equal(await missingCategoryNote.count(), 0);

    await f.analysis.getByRole("button", { name: "Run preview again", exact: true }).click();
    await until(() => f.analysisRequests.length === 2, "Rerunning category counts refreshes omissions");
    await f.analysisRequests[1].respond(results(2));
    await f.analysis.getByText("2 observations were skipped because Activities was missing or unusable.", { exact: true }).waitFor();
    assert.equal(await missingCategoryNote.count(), 1, "Shared missing-category totals appear once");
    assert.equal(await excludedColumn.count(), 0);
    assert.deepEqual(f.failures, []);
    console.log("PASS: category previews round percentages and show missing categories once when present");
  } finally { await f.context.close(); }
}

async function distinctPreview(browser) {
  const saved = session({});
  saved.analysis.inputs = [{ ...distinctValueInput, selectedInput: activityIdOutput }, { ...distinctGroupInput, selectedInput: output }];
  saved.analysis.params = [];
  saved.analysis.selectedAnalyticsMethod = { method: distinctMethod, mapping: { mapping: [
    { inputPort: distinctValueInput, outputPort: activityIdOutput }, { inputPort: distinctGroupInput, outputPort: output },
  ] } };
  const f = await fixture(browser, saved);
  try {
    const results = (excluded, ungrouped) => ({ data: { columns: {
      category: column("category", "Text", ["First activity", "Second activity"], "Group"),
      distinct_count: column("distinct_count", "Numeric", [4, 2], "Distinct values"),
      excluded_count: column("excluded_count", "Numeric", excluded, "Rows without a value"),
      ungrouped_count: column("ungrouped_count", "Numeric", ungrouped, "Rows without a group (whole dataset)"),
    } } });
    const diagnosticColumns = f.analysis.getByRole("columnheader", { name: /^Rows without a (value|group)/ });
    const skippedEventsNote = f.analysis.getByText(/observations were skipped because/);
    const inputs = f.analysis.getByRole("region", { name: "Method inputs", exact: true });
    const groupControl = inputs.getByRole("combobox", { name: "Group (Optional)", exact: true });
    await groupControl.waitFor();
    assert.equal(await groupControl.count(), 1);
    await inputs.getByText("object.id", { exact: true }).waitFor();
    await inputs.getByText("object.definition.name.en-US", { exact: true }).waitFor();
    await until(() => f.analysisRequests.length === 1, "The grouped distinct count auto-previews");
    assert.equal(f.analysisRequests[0].body.analyticsTechniqueId, distinctMethod.id);
    assert.deepEqual(f.analysisRequests[0].body.indicatorQuery.outputs, [activityIdOutput.id, output.id]);
    await f.analysisRequests[0].respond(results([0, 0], [0, 0]));
    await f.analysis.getByRole("cell", { name: "First activity", exact: true }).waitFor();
    assert.equal(await diagnosticColumns.count(), 0);
    assert.equal(await skippedEventsNote.count(), 0);

    await f.analysis.getByRole("button", { name: "Run preview again", exact: true }).click();
    await until(() => f.analysisRequests.length === 2, "Rerunning distinct counts refreshes omissions");
    await f.analysisRequests[1].respond(results([1, 2], [2, 2]));
    await f.analysis.getByText("3 observations were skipped because Activity identifier was missing or unusable. 2 observations were skipped because Activities was missing or unusable.", { exact: true }).waitFor();
    assert.equal(await skippedEventsNote.count(), 1, "Missing values are summed per group, and the shared missing-group count appears once");
    assert.equal(await diagnosticColumns.count(), 0);
    assert.deepEqual(f.failures, []);
    console.log("PASS: distinct counts use one optional group label and summarize omitted rows only when present");
  } finally { await f.context.close(); }
}

async function legacyIdentityMapping(browser) {
  const saved = session({}, true);
  saved.analysis.inputs = [categoryInput];
  saved.analysis.params = [];
  saved.analysis.selectedAnalyticsMethod = { method: categoryMethod, mapping: { mapping: [] } };
  saved.lockedStep.analysis.openPanel = false;
  const oldOutput = { id: "statement.actor.account.name", type: "Text", name: "Users (account name)" };
  const f = await fixture(browser, saved, {
    legacyAnalysisMapping: [{ inputPort: categoryInput, outputPort: oldOutput }],
  });
  try {
    await f.page.getByText("Learner identity fields were removed from this draft. Review Method inputs before saving.", { exact: true }).waitFor();
    const inputs = f.analysis.getByRole("region", { name: "Method inputs", exact: true });
    const category = inputs.getByRole("combobox", { name: "Event category (Required)", exact: true });
    await category.waitFor();
    assert.equal(await inputs.getByText("actor.account.name", { exact: true }).count(), 0);
    assert.equal(await f.analysis.getByRole("button", { name: "Next", exact: true }).isDisabled(), true);
    assert.equal(await f.page.getByRole("region", { name: "Visualization step", exact: true }).getAttribute("aria-disabled"), "true");
    await category.click();
    assert.equal(await f.page.getByRole("option", { name: /^Users \(/ }).count(), 0);
    assert.equal(f.analysisRequests.length, 0, "The legacy mapping never triggers an automatic preview");
    await f.page.getByRole("option", { name: "Activities", exact: true }).click();
    await until(() => f.analysisRequests.length === 1, "A new activity mapping enables the preview");
    assert.deepEqual(f.analysisRequests[0].body.indicatorQuery.outputs, [output.id]);
    await f.analysisRequests[0].respond({ data: { columns: columns("Safe activity summary") } });
    await f.analysis.getByRole("cell", { name: "Safe activity summary", exact: true }).waitFor();
    assert.deepEqual(f.failures, []);
    console.log("PASS: a restored draft clears learner identifiers and previews a replacement activity field");
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
    await navigation(browser);
    await recovery(browser);
    await incompleteInputs(browser);
    await numericInputs(browser);
    await countEventsDefault(browser);
    await dataAwareRecommendations(browser);
    await categoryPreview(browser);
    await distinctPreview(browser);
    await legacyIdentityMapping(browser);
    await parameterGating(browser);
    await filterChanges(browser);
    await catalogAndMethodRaces(browser);
    await emptyVisualization(browser);
    await chartInvalidation(browser);
  }
  finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
