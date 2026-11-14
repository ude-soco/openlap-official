// Start Vite with VITE_BACKEND_URL=/api/, then run with Playwright/WebKit on NODE_PATH:
// OPENLAP_TEST_BASE_URL=http://127.0.0.1:5181 node scripts/test-saved-indicator-preview.cjs
// --expect-blank-baseline serves the old integer-only width helper to this synthetic
// browser context only: decimal saved charts must fail while integer charts render.
// Every API/identity is synthetic. The Apex CDN response is the installed local npm
// distribution; other chart dependencies are inert and all other off-origin traffic fails.
const { webkit } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const baseline = process.argv.slice(2).includes("--expect-blank-baseline");
assert.ok(process.argv.slice(2).every((argument) => argument === "--expect-blank-baseline"), "Unknown test argument");
const base = new URL(process.env.OPENLAP_TEST_BASE_URL || "http://127.0.0.1:5181");
assert.equal(base.protocol, "http:");
assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(base.hostname));
assert.equal(base.username + base.password + base.search + base.hash, "");
const apexPath = process.env.OPENLAP_TEST_APEX_JS || path.resolve(__dirname, "../node_modules/apexcharts/dist/apexcharts.min.js");
const apexUrl = "https://cdn.jsdelivr.net/npm/apexcharts@8.8.1/dist/apexcharts.min.js";
const inertAssets = new Set([
  "https://cdnjs.cloudflare.com/ajax/libs/c3/0.7.18/c3.min.css",
  "https://d3js.org/d3.v5.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/c3/0.7.18/c3.min.js",
]);
const helperPath = "/src/pages/indicators/indicator-editor/components/utils/make-apex-charts-responsive.js";
const oldHelper = String.raw`
const APEX_FIXED_WIDTH_RE = /,\s*width:\s*["']?\d+["']?/;
export const makeApexChartsResponsive = (scriptData) => typeof scriptData === "string"
  ? scriptData.replace(APEX_FIXED_WIDTH_RE, "") : scriptData;
`;

// Mirrors the reviewed historical Apex generator's Bar/Pie markup, including the
// Gson-restored decimal dimensions that distinguish saved charts from live drafts.
function chartCode(type, decimal) {
  const dimension = decimal ? "500.0" : "500";
  const common = `colors: ['#008ffb', '#ff5733'], legend: {showForSingleSeries: true, show: true, position: 'bottom'},
    title: {text: 'Synthetic saved chart', align: 'left', style: {fontSize: 18}}, subtitle: {text: '', align: 'left'},
    dataLabels: {enabled: true, style: { colors: ['#000000'], fontWeight: 400 }, background: {enabled: false}}`;
  const options = type === "bar"
    ? `chart: {type: 'bar', toolbar: {show: false}, animations: {enabled: false}, height: ${dimension}, width: ${dimension}},
       ${common}, yaxis: {labels: {show: true}}, plotOptions: {bar: {dataLabels: {position: 'bottom'}}},
       series: [{name: 'Count', data: [10.0, 2.0]}], xaxis: {labels: {show: true}, categories: ['Synthetic alpha', 'Synthetic beta']}`
    : `series: [10.0, 2.0], chart: {type: 'pie', height: ${dimension}, toolbar: {show: false}, animations: {enabled: false}, width: ${dimension}},
       ${common}, labels: ['Synthetic alpha', 'Synthetic beta'],
       responsive: [{breakpoint: 480, options: {chart: {width: 200}, legend: {position: 'bottom'}}}]`;
  return `<div id="chart"></div><script>var options = {${options}};
    var chart = new ApexCharts(document.querySelector("#chart"), options);chart.render();</script>`;
}

const definitions = [
  { id: "fixture-id", name: "Saved decimal bar", type: "bar", decimal: true },
  { id: "fixture-integer", name: "Saved integer bar", type: "bar", decimal: false },
  { id: "fixture-pie", name: "Saved decimal pie", type: "pie", decimal: true },
];
const column = (id, type, data) => ({ configurationData: { id, title: id, type }, data });
function detail(definition) {
  return {
    id: definition.id, name: definition.name, type: "BASIC", createdOn: "2026-01-01T12:00:00",
    createdBy: "Synthetic fixture user", analyticsTechnique: "Synthetic counts",
    visualizationLibrary: "Synthetic Apex", visualizationType: definition.type === "bar" ? "Bar Chart" : "Pie Chart",
    indicatorCode: encodeURIComponent(chartCode(definition.type, definition.decimal)),
    configuration: JSON.stringify({
      dataset: { selectedLRSList: [{ lrsTitle: "Synthetic source" }] },
      analysis: { analyzedData: {
        labels: column("Activity", "Text", ["Synthetic alpha", "Synthetic beta"]),
        values: column("Count", "Numeric", [10, 2]),
      } },
    }),
  };
}

async function assertVisibleChart(page, type) {
  const section = page.getByRole("region", { name: "Visualization", exact: true });
  const svg = section.locator("#chart svg.apexcharts-svg");
  await svg.waitFor({ state: "visible" });
  const bounds = await svg.boundingBox();
  assert.ok(bounds.width > 100 && bounds.height > 100, "Chart SVG must have visible dimensions");
  assert.equal(await section.locator("#chart").count(), 1, "Only the current chart container is mounted");
  if (type === "bar") {
    const bars = section.locator(".apexcharts-bar-area");
    assert.equal(await bars.count(), 2, "Both synthetic values must be rendered as bars");
    const values = await bars.evaluateAll((elements) => elements.map((element) => Number(element.getAttribute("val"))));
    assert.deepEqual(values, [10, 2]);
    const labels = await section.locator(".apexcharts-xaxis-label").allTextContents();
    assert.ok(labels.some((text) => text.includes("Synthetic alpha")), "First category label is visible");
    assert.ok(labels.some((text) => text.includes("Synthetic beta")), "Second category label is visible");
  } else {
    const slices = section.locator(".apexcharts-pie-area");
    assert.equal(await slices.count(), 2, "Both synthetic values must be rendered as slices");
    assert.deepEqual(await slices.evaluateAll((elements) => elements.map((element) => Number(element.getAttribute("data:angle"))).map(Math.round)), [300, 60]);
    const labels = await section.locator(".apexcharts-legend-text").allTextContents();
    assert.deepEqual(labels, ["Synthetic alpha", "Synthetic beta"]);
  }
  const dataset = page.getByRole("region", { name: "Dataset", exact: true });
  await dataset.getByRole("cell", { name: "Synthetic alpha", exact: true }).waitFor();
  await dataset.getByRole("cell", { name: "10", exact: true }).waitFor();
  await dataset.getByRole("cell", { name: "2", exact: true }).waitFor();
}

async function openFromDashboard(page, name) {
  await page.getByRole("link", { name: "My Indicators", exact: true }).first().click();
  await page.getByRole("button", { name: "Preview " + name, exact: true }).click();
}

(async () => {
  // Saved charts use the global CDN build, while the ISC creator uses npm.
  // Keep every HTML entry point on the version that this regression exercises.
  for (const relative of ["../index.html", "../../analyticsframework/src/main/resources/templates/indicator.html",
    "../../analyticsframework/src/main/resources/templates/question.html"]) {
    const html = await fs.readFile(path.resolve(__dirname, relative), "utf8");
    const sources = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']*apexcharts[^"']*)["']/g)].map((match) => match[1]);
    assert.deepEqual(sources, [apexUrl], relative + " must pin the qualified Apex CDN version");
  }
  if (!process.env.OPENLAP_TEST_APEX_JS) {
    const pkg = JSON.parse(await fs.readFile(path.resolve(__dirname, "../node_modules/apexcharts/package.json"), "utf8"));
    assert.equal(apexUrl, "https://cdn.jsdelivr.net/npm/apexcharts@" + pkg.version + "/dist/apexcharts.min.js",
      "Global saved previews and npm-rendered ISC charts must use the same qualified version");
  }
  const apex = await fs.readFile(apexPath);
  assert.ok(apex.length > 100000 && apex.includes(Buffer.from("ApexCharts")), "A real local ApexCharts distribution is required");
  const browser = await webkit.launch({ headless: true,
    ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) });
  const context = await browser.newContext({ viewport: { width: 1280, height: 1100 } });
  // Development HMR must not replace modules during saved-chart navigation.
  await context.routeWebSocket(/.*/, (socket) => socket.close());
  const failures = [], pageErrors = [], requests = [];
  let apexLoads = 0, helperOverrides = 0;
  try {
    const token = "e30." + Buffer.from(JSON.stringify({ sub: "fixture@localhost", roles: ["ROLE_USER"],
      exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url") + ".fixture";
    await context.addInitScript((token) => {
      localStorage.setItem("authTokens", JSON.stringify({ access_token: token, refresh_token: token }));
    }, token);
    await context.route("**/*", async (route) => {
      const request = route.request(), url = new URL(request.url());
      if (url.href === apexUrl) {
        apexLoads++;
        return route.fulfill({ contentType: "application/javascript", body: apex });
      }
      if (inertAssets.has(url.href)) return route.fulfill({
        contentType: url.pathname.endsWith(".css") ? "text/css" : "application/javascript", body: "/* Synthetic fixture: unused chart dependency. */",
      });
      if (url.origin !== base.origin) {
        failures.push("Off-origin request: " + url.origin);
        return route.abort();
      }
      if (baseline && url.pathname === helperPath) {
        helperOverrides++;
        return route.fulfill({ contentType: "application/javascript", body: oldHelper });
      }
      if (!url.pathname.startsWith("/api/")) return route.continue();
      const apiPath = url.pathname.slice(5);
      requests.push(apiPath);
      const send = (data) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ data, message: "Synthetic fixture" }) });
      if (apiPath === "v1/users/my") return send({ name: "Synthetic fixture user", email: "fixture@localhost", roles: ["ROLE_USER"] });
      if (apiPath === "v1/indicators/my") return send({
        content: definitions.map((item) => ({ id: item.id, indicatorName: item.name, type: "BASIC", createdOn: "2026-01-01T12:00:00" })),
        totalElements: definitions.length, pageable: { pageSize: 10, pageNumber: 0 },
      });
      const definition = definitions.find((item) => apiPath === "v1/indicators/" + item.id);
      if (definition) return send(detail(definition));
      failures.push("Unexpected API request: " + apiPath);
      return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "Unexpected synthetic API request" }) });
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => pageErrors.push(error));
    await page.goto(new URL("/indicator/fixture-id", base).href);
    await page.getByRole("region", { name: "Dataset", exact: true }).getByRole("cell", { name: "Synthetic alpha", exact: true }).waitFor();
    if (baseline) {
      await page.waitForFunction(() => document.querySelector("#chart"));
      await page.waitForTimeout(250);
      assert.equal(await page.locator("#chart svg.apexcharts-svg").count(), 0, "Old helper must reproduce the blank decimal saved preview");
      assert.ok(pageErrors.some((error) => error.name === "SyntaxError" && /number|identifier|token/i.test(error.message)), "Old helper must produce the JavaScript syntax failure");
      assert.equal(helperOverrides, 1, "Baseline helper override was applied");
      pageErrors.length = 0;
      await openFromDashboard(page, "Saved integer bar");
      await assertVisibleChart(page, "bar");
      assert.deepEqual(pageErrors, [], "Integer control still renders under the old helper");
      console.log("PASS: old helper reproduces blank decimal saved Bar with SyntaxError; integer control renders 10/2 and both labels");
    } else {
      await assertVisibleChart(page, "bar");
      const originalWidth = await page.locator("#chart svg.apexcharts-svg").evaluate((svg) => Number(svg.getAttribute("width")));
      await page.setViewportSize({ width: 1000, height: 1100 });
      await page.waitForFunction((originalWidth) => Number(document.querySelector("#chart svg.apexcharts-svg")?.getAttribute("width")) < originalWidth - 100, originalWidth);
      await assertVisibleChart(page, "bar");
      await page.setViewportSize({ width: 1280, height: 1100 });
      await page.waitForFunction((originalWidth) => Math.abs(Number(document.querySelector("#chart svg.apexcharts-svg")?.getAttribute("width")) - originalWidth) <= 2, originalWidth);
      await openFromDashboard(page, "Saved integer bar");
      await assertVisibleChart(page, "bar");
      await openFromDashboard(page, "Saved decimal pie");
      await assertVisibleChart(page, "pie");
      const widths = await page.evaluate(() => ({ fixed: options.chart.width,
        breakpoint: options.responsive[0].options.chart.width }));
      assert.equal(widths.fixed, undefined, "Remove only fixed chart width");
      assert.equal(widths.breakpoint, 200, "Preserve Pie responsive breakpoint width");
      await page.setViewportSize({ width: 450, height: 1100 });
      await page.waitForFunction(() => Number(document.querySelector("#chart svg.apexcharts-svg")?.getAttribute("width")) === 200);
      await assertVisibleChart(page, "pie");
      await page.setViewportSize({ width: 1280, height: 1100 });
      await openFromDashboard(page, "Saved decimal bar");
      await assertVisibleChart(page, "bar");
      assert.deepEqual(pageErrors.map((error) => error.message), [], "Saved chart navigation must not throw browser errors");
      assert.equal(helperOverrides, 0);
      console.log("PASS: saved decimal/integer Bar render 10/2 and resize without blanking; Pie renders and applies its 200px breakpoint; saved Bar remount renders again");
    }
    assert.equal(apexLoads, 1, "Apex dependency is supplied from local npm exactly once");
    assert.ok(requests.includes("v1/indicators/fixture-id"), "The real saved-indicator API path is exercised");
    assert.deepEqual(failures, []);
    console.log("Apex local distribution SHA256=" + crypto.createHash("sha256").update(apex).digest("hex"));
  } finally { await context.close(); await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
