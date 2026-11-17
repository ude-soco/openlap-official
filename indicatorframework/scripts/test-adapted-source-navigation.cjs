// Real editors and renderer handshake, entirely synthetic owner-bound APIs.
// This test never contacts a database, deployed service or external runtime.
const { webkit } = require("playwright");
const assert = require("node:assert/strict");
const chartRendererFixture = require("./chart-renderer-fixture.cjs");
const navigation = require("./editor-navigation-assertions.cjs");

const base = new URL(process.env.OPENLAP_TEST_BASE_URL || "http://127.0.0.1:15281");
assert.equal(base.protocol, "http:");
assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(base.hostname));
assert.equal(base.username + base.password + base.search + base.hash, "");
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const port = (id, type, title = id) => ({ id, type, title, required: true });
const column = (configurationData, data) => ({ configurationData, data });
const method = { id: "count", name: "Count items" };
const additionalMethod = { id: "sum", name: "Analyze combined counts" };
const itemsInput = port("items", "Text", "Items");
const combinedInput = port("counts", "Numeric", "Counts");
const outputs = [port("item_name", "Text", "Materials"), port("item_count", "Numeric", "Count")];
const store = { id: "synthetic-lrs", lrsId: "synthetic-lrs", uniqueIdentifier: "synthetic-viewer", lrsTitle: "Synthetic source data" };
const activityType = { id: "material", name: "Material" };
const action = { id: "accessed", name: "Accessed" };
const activity = { id: "Synthetic material", name: "Synthetic material", queryId: "statement.object.definition.name.en-US" };
const library = { id: "synthetic-library", name: "Synthetic charts" };
const chart = { id: "grouped", name: "Grouped bar", imageCode: "GroupBar",
  chartInputs: [port("category", "Text", "Materials"), port("series", "Text", "Series"), port("value", "Numeric", "Values")],
  chartConfiguration: { showHideLegendAvailable: true, chartTitleAvailable: true } };
const chartData = { columns: {
  category: column(port("category", "Text", "Materials"), ["Shared material", "Shared material"]),
  series: column(port("series", "Text", "Series"), ["First source", "Second source"]),
  value: column(port("value", "Numeric", "Count"), [12, 8]),
} };
const combined = { columns: {
  key: column(port("key", "Text", "Materials"), ["Shared material"]),
  first_count: column(port("first_count", "Numeric", "First source count"), [12]),
  second_count: column(port("second_count", "Numeric", "Second source count"), [8]),
}, chartData };
const encodedChart = encodeURIComponent('<svg width="100%" height="300" viewBox="0 0 600 300" role="img" aria-label="Synthetic adapted chart"><title>Synthetic adapted chart</title><rect width="240" height="160" fill="blue" /></svg><script>/* Synthetic chart. */</script>');

async function checkType(browser, type, models) {
  const { emptyBasicState, serializeBasicDraft, newComplexConfiguration, sourceExecutionSelections, activitiesOutput } = models;
  const configuration = newComplexConfiguration(type);
  configuration.name = `${type} navigation fixture`;
  configuration.sources = ["source-one", "source-two"].map((id, index) => ({ id, name: `${index ? "Second" : "First"} source`,
    label: `${index ? "Second" : "First"} source`, analyticsMethod: method, outputs, keyColumnId: "item_name", measureColumnIds: ["item_count"] }));
  configuration.sourceDrafts = Object.fromEntries(configuration.sources.map((source) => {
    const basic = emptyBasicState(new Date("2026-11-01T00:00:00Z"));
    basic.indicator.indicatorName = source.name;
    basic.dataset.selectedLRSList = [store];
    basic.filters.selectedActivities = [{ id: "synthetic-filter", selectedActivityType: activityType,
      selectedActionList: [action], selectedActivityList: [activity] }];
    basic.analysis.selectedAnalyticsMethod = { method, mapping: { mapping: [{ inputPort: itemsInput, outputPort: activitiesOutput }] } };
    // A configured source can be inspected at Dataset/Filters without running
    // its analysis. The parent's adapted pipeline executes its selections.
    basic.lockedStep.filters.locked = false;
    return [source.id, serializeBasicDraft(basic)];
  }));
  if (type === "MULTI_LEVEL") configuration.analysis = { methodId: additionalMethod.id, params: [],
    mapping: { mapping: [{ inputPort: combinedInput, outputPort: combined.columns.first_count.configurationData }] } };
  configuration.visualization = { libraryId: library.id, typeId: chart.id, params: {}, dataMode: "combined",
    mapping: { mapping: chart.chartInputs.map((inputPort) => ({ inputPort, outputPort: chartData.columns[inputPort.id].configurationData })) } };
  const draft = { id: `adapted-navigation-${type.toLowerCase()}`, name: configuration.name, indicatorType: type,
    schemaVersion: 1, revision: 0, status: "DRAFT", recoverable: true, configuration,
    adaptation: { schemaVersion: 1, poolId: "synthetic-community-entry", sourceVersion: "v1",
      reference: { name: "Synthetic community indicator", type, sources: [] } } };
  const failures = [], executions = [], writes = [];
  const context = await browser.newContext({ viewport: { width: 1680, height: 1000 }, reducedMotion: "reduce" });
  const token = "e30." + Buffer.from(JSON.stringify({ sub: "source.navigation@example.test", roles: ["ROLE_USER"],
    exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url") + ".fixture";
  await context.addInitScript((value) => localStorage.setItem("authTokens", JSON.stringify({ access_token: value, refresh_token: value })), token);
  await context.routeWebSocket(/.*/, (socket) => socket.close());
  const renderer = chartRendererFixture(base);
  await context.route("**/*", async (route) => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== base.origin) { failures.push(`Off-origin request ${url.origin}`); return route.abort(); }
    if (await renderer(route)) return;
    if (!url.pathname.startsWith("/api/")) return route.continue();
    const path = url.pathname.slice(5), body = request.postData() ? request.postDataJSON() : null;
    const send = (data, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify({ data }) });
    if (path === `v1/indicators/drafts/${draft.id}`) {
      if (request.method() === "PUT") {
        assert.equal(body.revision, draft.revision, "Fixture writes use the current owned revision");
        writes.push(structuredClone(body));
        Object.assign(draft, body, { revision: draft.revision + 1 });
      } else assert.equal(request.method(), "GET");
      return send(draft);
    }
    if (path === `v1/indicators/drafts/${draft.id}/adaptation-preview`) {
      assert.equal(body.revision, draft.revision, "Preview executes the current saved draft");
      executions.push(body.stage);
      return send(body.stage === "visualization" ? { status: "READY", previewCode: encodedChart }
        : { status: "READY", data: body.stage === "analysis" ? chartData : combined });
    }
    const responses = {
      "v1/users/my": { name: "Synthetic viewer", roles: ["ROLE_USER"] },
      "v1/users/my/lrs": [store], "v1/analytics/methods": [method, additionalMethod],
      "v1/analytics/methods/outputs/count": outputs,
      "v1/analytics/methods/input-params/count": { inputs: [itemsInput], params: [] },
      "v1/analytics/methods/input-params/sum": { inputs: [combinedInput], params: [] },
      "v1/visualizations/libraries": [library],
      "v1/visualizations/libraries/synthetic-library/types": [chart],
      "v1/statements/activity-types": [activityType], "v1/statements/actions": [action], "v1/statements/activities": [activity],
    };
    if (Object.hasOwn(responses, path)) return send(responses[path]);
    failures.push(`Unexpected API ${request.method()} ${path}`);
    return send({}, 500);
  });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on("pageerror", (error) => failures.push(error.message));
  let stage = "opening configured sources";
  const sourceSection = () => page.locator('[data-editor-step="sources"]');
  const sourceNext = () => sourceSection().getByRole("button", { name: "Next", exact: true });
  const chartFrame = () => page.frameLocator('iframe[title="OpenLAP chart preview"]');
  const waitForChart = async () => {
    await navigation.chooseStep(page, "Visualization", "visualization");
    await chartFrame().getByRole("img", { name: "Synthetic adapted chart", exact: true }).waitFor();
    await navigation.until(() => page.getByRole("button", { name: "Save indicator", exact: true }).isEnabled(), "The retained chart has completed its renderer handshake");
  };
  try {
    await page.goto(new URL(`indicator/editor/drafts/${draft.id}`, base).href);
    await navigation.until(() => sourceNext().isEnabled(), "Both configured sources are ready to combine");
    assert.deepEqual(executions, [], "Opening source selections does not execute a pipeline before confirmation");
    await sourceNext().click();
    await navigation.until(() => executions.includes("visualization"), "Configured selections generate the parent preview");
    await waitForChart();
    await page.getByText("Draft saved", { exact: true }).waitFor();
    await pause(600);
    const expectedStages = type === "MULTI_LEVEL" ? ["combine", "analysis", "visualization"] : ["combine", "visualization"];
    assert.deepEqual(executions, expectedStages, "The first parent pipeline executes each required stage once");
    const originalSelections = sourceExecutionSelections(structuredClone(draft.configuration.sourceDrafts["source-one"]));

    stage = "navigating an embedded source without changing its data";
    await navigation.chooseStep(page, "Select indicators", "sources");
    await sourceSection().getByRole("button", { name: "Edit source", exact: true }).first().click();
    await navigation.assertLanding(page, "Dataset", "dataset");
    await navigation.chooseStep(page, "Filters", "filters");
    await page.getByRole("radio", { name: "Use only my data", exact: true }).waitFor();
    await page.getByRole("button", { name: "Back to sources", exact: true }).click();
    await navigation.assertLanding(page, "Select indicators", "sources");
    await page.getByText("Draft saved", { exact: true }).waitFor();
    await pause(700);
    assert.deepEqual(sourceExecutionSelections(draft.configuration.sourceDrafts["source-one"]), originalSelections,
      "Source navigation preserves every execution selection");
    assert.equal(draft.configuration.sourceDrafts["source-one"].lockedStep.filters.openPanel, true,
      "The source editor's UI state still persists in its parent draft");
    assert.deepEqual(executions, expectedStages, "Source hydration, panel navigation and returning do not rerun the parent pipeline");
    await navigation.chooseStep(page, "Combine data", "combine");
    await page.getByRole("cell", { name: "Shared material", exact: true }).first().waitFor();
    if (type === "MULTI_LEVEL") {
      await navigation.chooseStep(page, "Analysis", "analysis");
      await page.getByRole("cell", { name: "First source", exact: true }).first().waitFor();
    }
    await waitForChart();
    assert.deepEqual(executions, expectedStages, "Returning to the retained data and chart does not execute plugins again");

    stage = "invalidating results after a real source selection changes";
    await navigation.chooseStep(page, "Select indicators", "sources");
    await sourceSection().getByRole("button", { name: "Edit source", exact: true }).first().click();
    await navigation.assertLanding(page, "Dataset", "dataset");
    await navigation.chooseStep(page, "Filters", "filters");
    await page.getByRole("radio", { name: "Use data of all users", exact: true }).click();
    await page.getByRole("button", { name: "Back to sources", exact: true }).click();
    await navigation.assertLanding(page, "Select indicators", "sources");
    await page.getByText("Draft saved", { exact: true }).waitFor();
    assert.equal(draft.configuration.sourceDrafts["source-one"].filters.selectedUserFilter, "INCLUDE_ME");
    assert.equal(draft.configuration.sourceDrafts["source-two"].filters.selectedUserFilter, "ONLY_ME", "Source data scopes remain independent");
    assert.equal(await navigation.navigator(page).getByRole("button", { name: /^Visualization,/ }).getAttribute("aria-disabled"), "true",
      "Changing source data invalidates the old parent chart instead of displaying stale results");
    assert.deepEqual(executions, expectedStages, "Invalidated results wait for source confirmation");
    await sourceNext().click();
    await navigation.until(() => executions.filter((value) => value === "visualization").length === 2, "Confirming the real edit regenerates the pipeline");
    await waitForChart();
    assert.deepEqual(executions, [...expectedStages, ...expectedStages], "Only an actual source edit requires fresh combined, analyzed and chart results");
    await navigation.assertNoOverflow(page);
    assert.ok(writes.length > 0, "Source UI and data edits are persisted through the normal draft API");
    assert.deepEqual(failures, []);
    console.log(`PASS: ${type} retains combined data${type === "MULTI_LEVEL" ? ", analysis" : ""} and chart across embedded source navigation; real source edits regenerate safely`);
  } catch (error) {
    console.error(`${type} failed while ${stage}; stages=${executions.join(",")}; failures=${JSON.stringify(failures)}`);
    throw error;
  } finally { await context.close(); }
}

(async () => {
  const basic = await import("../src/pages/indicators/indicator-editor/basic-indicator/utils/basic-draft-model.js");
  const complex = await import("../src/pages/indicators/indicator-editor/complex-indicator/complex-model.js");
  const { analyticsInputMenuList } = await import("../src/pages/indicators/indicator-editor/basic-indicator/components/analysis/utils/analysis-data.js");
  const browser = await webkit.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) });
  try {
    for (const type of ["COMPOSITE", "MULTI_LEVEL"]) await checkType(browser, type,
      { ...basic, ...complex, activitiesOutput: analyticsInputMenuList[0] });
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
