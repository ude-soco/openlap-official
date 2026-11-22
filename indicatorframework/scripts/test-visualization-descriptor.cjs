// Render the actual shared chart picker/customization controls with synthetic
// providers. No backend, saved indicators, or third-party network access.
const { webkit } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { spawn } = require("node:child_process");

const appRoot = path.resolve(__dirname, "..");
const port = Number(process.env.OPENLAP_DESCRIPTOR_TEST_PORT || 5191);
const base = new URL("http://127.0.0.1:" + port);
const fixturePath = path.join(__dirname, ".visualization-descriptor-" + process.pid + ".jsx");
const htmlPath = path.join(appRoot, ".visualization-descriptor-" + process.pid + ".html");
const fixtureSource = String.raw`
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { MemoryRouter } from "react-router-dom";
import { CssBaseline, Stack } from "@mui/material";
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import { createAppTheme } from "/src/common/theme/app-theme.js";
import { BasicContext } from "/src/pages/indicators/indicator-editor/basic-indicator/basic-indicator.jsx";
import ChartTypeOptions from "/src/pages/indicators/indicator-editor/basic-indicator/components/visualization/components/chart-type-options.jsx";
import ChartCustomizationPanel from "/src/pages/indicators/indicator-editor/basic-indicator/components/visualization/components/customization/chart-customization-panel.jsx";
import PluginRuntimeReview from "/src/pages/admin/components/plugin-runtime-review.jsx";
import { getVisualizationDefaults } from "/src/pages/indicators/indicator-editor/basic-indicator/components/visualization/utils/visualization-descriptor.js";
import { defaultParams } from "/src/pages/indicators/indicator-editor/basic-indicator/components/visualization/utils/visualization-data.js";
const descriptor = {
  schemaVersion: 1, id: "new-chart", runtimeId: "native", description: "A new reusable chart.",
  inputRoles: { category: "labels", series: "groups" },
  customizations: [
    { id: "caption", label: "Chart caption", type: "text", group: "elements", defaultValue: "Plugin default" },
    { id: "showLabels", label: "Show values", type: "boolean", group: "elements", defaultValue: true },
    { id: "notes", label: "Notes", type: "text", group: "elements", defaultValue: "", visibleWhen: { id: "showLabels", equals: false } },
    { id: "fill", label: "Bar color", type: "color", group: "styles", defaultValue: "#1976d2" },
    { id: "direction", label: "Direction", type: "select", group: "styles", defaultValue: "horizontal", options: [
      { value: "horizontal", label: "Horizontal" }, { value: "vertical", label: "Vertical" } ] },
    { id: "typedChoice", label: "Typed choice", type: "select", group: "styles", defaultValue: false, options: [
      { value: false, label: "Boolean false" }, { value: "false", label: "Text false" }, { value: 0, label: "Zero" } ] },
    { id: "limit", label: "Number of values", type: "number", group: "filters", min: 1, max: 20, step: 1, defaultValue: 10 },
    { id: "hiddenCategories", label: "Visible categories", type: "categoryFilter", group: "filters", defaultValue: [] },
    { id: "seriesColors", label: "Series colors", type: "seriesColors", source: "series", group: "styles", defaultValue: [] },
  ],
};
const inputs = [{ id: "labels", type: "Text", required: true }, { id: "values", type: "Numeric", required: true },
  { id: "groups", type: "Text", required: false }];
const newChart = { id: "new", name: "New reusable chart", imageCode: "UnknownPluginChart", chartInputs: inputs,
  chartConfiguration: {}, visualizationDescriptor: descriptor };
const legacyChart = { id: "legacy", name: "Existing bar chart", imageCode: "Bar", chartInputs: inputs,
  chartConfiguration: { showHideLegendAvailable: true, chartTitleAvailable: true } };
const brokenIconChart = { ...newChart, id: "broken", name: "Broken icon chart", visualizationDescriptor: { ...descriptor, iconAssetId: "missing-icon" } };
const runtimeManifest = { schemaVersion: 1, pluginId: "org.openlap.fixture", pluginVersion: "2.4.0",
  assets: [
    { id: "style", path: "web/native-2.4.0.css", kind: "style", sha256: "1".repeat(64) },
    { id: "script", path: "web/native-2.4.0.js", kind: "script", sha256: "2".repeat(64) },
    { id: "chart-icon", path: "web/chart-icon.svg", kind: "image", sha256: "3".repeat(64) },
  ], runtimes: [{ id: "native", version: "2.4.0", assets: ["style", "script"] }],
  charts: [{ ...descriptor, implementingClass: "org.openlap.fixture.Bar", iconAssetId: "chart-icon" },
    { id: "line", implementingClass: "org.openlap.fixture.Line", runtimeId: "native", customizations: [] }],
};
const columns = { category: { configurationData: { id: "category", type: "Text" }, data: ["Alpha", "Beta", "Alpha", "Gamma"] },
  series: { configurationData: { id: "series", type: "Text" }, data: ["Group A", "Group B", "Group B", "Group A"] },
  amount: { configurationData: { id: "amount", type: "Numeric" }, data: [4, 3, 2, 1] } };
const mapping = { mapping: [
  { inputPort: { id: "labels" }, outputPort: { id: "category" } },
  { inputPort: { id: "groups" }, outputPort: { id: "series" } },
] };
function Fixture() {
  const [visualization, setVisualization] = useState({ selectedType: legacyChart,
    params: getVisualizationDefaults(legacyChart, defaultParams), mapping: { mapping: [] } });
  const [open, setOpen] = useState(true);
  const [withIcon, setWithIcon] = useState(false);
  const [legacyReview, setLegacyReview] = useState(false);
  const declaredNew = withIcon ? { ...newChart, visualizationDescriptor: { ...descriptor, iconAssetId: "chart-icon" } } : newChart;
  window.__descriptorFixture = { snapshot: () => visualization, unsupported: () => setVisualization((previous) => ({
    ...previous, selectedType: { ...previous.selectedType, visualizationDescriptor: { ...descriptor,
      customizations: [...descriptor.customizations, { id: "extension", type: "executable", group: "elements" }] } },
  })), enableIcon: () => setWithIcon(true), legacyReview: () => setLegacyReview(true) };
  return <MemoryRouter><ThemeProvider theme={createAppTheme(createTheme())}><CssBaseline />
    <Stack component="main" sx={{ gap: 3, p: 2, maxWidth: 1100, mx: "auto" }}>
      <ChartTypeOptions types={[legacyChart, declaredNew, brokenIconChart]} analyzedData={columns} selectedTypeId={visualization.selectedType.id}
        onSelect={(chart) => setVisualization({ selectedType: chart,
          params: getVisualizationDefaults(chart, defaultParams), mapping })} />
      <button onClick={() => setOpen((value) => !value)}>{open ? "Close panel" : "Reopen panel"}</button>
      <BasicContext.Provider value={{ visualization, setVisualization, analysis: { analyzedData: columns } }}>
        {open && <Stack data-testid="customization" sx={{ width: { xs: "100%", md: 340 } }}><ChartCustomizationPanel /></Stack>}
      </BasicContext.Provider>
      <section data-testid="runtime-review"><PluginRuntimeReview manifest={legacyReview ? null : runtimeManifest}
        entries={[{ implementingClass: "org.openlap.fixture.Bar", name: "Reusable bar chart" }, { implementingClass: "org.openlap.fixture.Line", name: "Reusable line chart" }]} /></section>
    </Stack>
  </ThemeProvider></MemoryRouter>;
}
createRoot(document.getElementById("fixture")).render(<Fixture />);
`;

async function waitForServer(child) {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    if (child.exitCode != null) throw Error("Synthetic Vite exited before listening.");
    try { if ((await fetch(base)).ok) return; } catch { /* Server is starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw Error("Synthetic Vite did not start.");
}

(async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "openlap-descriptor-ui-"));
  let server, browser;
  let serverOutput = "";
  try {
    await fs.writeFile(fixturePath, fixtureSource);
    await fs.writeFile(htmlPath, '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="fixture"></div><script type="module" src="/scripts/' + path.basename(fixturePath) + '"></script></body></html>');
    const config = path.join(temporary, "vite.config.mjs");
    const dependencies = await fs.realpath(path.join(appRoot, "node_modules"));
    await fs.writeFile(config, "import base from " + JSON.stringify(path.join(appRoot, "vite.config.js")) + ";\nexport default {...base,root:" + JSON.stringify(appRoot) + ",cacheDir:" + JSON.stringify(path.join(temporary, "cache")) + ",server:{host:'127.0.0.1',port:" + port + ",strictPort:true,fs:{allow:" + JSON.stringify([appRoot, dependencies, temporary]) + "}}};\n");
    server = spawn(process.execPath, [path.join(appRoot, "node_modules/vite/bin/vite.js"), "--config", config], {
      cwd: appRoot, stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, VITE_BACKEND_URL: "/api/" },
    });
    server.stdout.on("data", (chunk) => { serverOutput += chunk; });
    server.stderr.on("data", (chunk) => { serverOutput += chunk; });
    await waitForServer(server);
    browser = await webkit.launch({ headless: true,
      ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}),
    });
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    await context.routeWebSocket(/.*/, (socket) => socket.close());
    const errors = [], external = [], iconRequests = [];
    await context.route("**/*", (route) => {
      const url = new URL(route.request().url());
      if (url.origin === base.origin && /^\/api\/v1\/code\/visualizations\/(new|broken)\/icon$/.test(url.pathname)) {
        iconRequests.push(url.pathname);
        return url.pathname.includes("/broken/")
          ? route.fulfill({ status: 404, contentType: "text/plain", body: "Missing fixture icon" })
          : route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><rect x="8" y="8" width="40" height="40" fill="#1976d2"/></svg>' });
      }
      if (url.origin !== base.origin || url.pathname.startsWith("/api/")) {
        external.push(url.origin + url.pathname);
        return route.abort();
      }
      return route.continue();
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(new URL(path.basename(htmlPath), base).href);
    const panel = page.getByTestId("customization");
    await panel.getByRole("switch", { name: "Show legend", exact: true }).waitFor();
    assert.equal(await panel.getByRole("tab", { name: "FILTERS", exact: true }).count(), 0, "Legacy capabilities still determine tabs");
    const selectNew = page.getByRole("button", { name: /^New reusable chart\./ });
    await selectNew.waitFor();
    assert.equal(await selectNew.locator('svg[data-testid="InsertChartOutlinedIcon"]').count(), 1,
      "A chart unknown to the fixed icon map remains visible and selectable");
    const broken = page.getByRole("button", { name: /^Broken icon chart\./ });
    await broken.locator('svg[data-testid="InsertChartOutlinedIcon"]').waitFor();
    assert.equal(await broken.locator("img").count(), 0, "An unavailable declared icon falls back to the generic chart icon");
    await page.evaluate(() => window.__descriptorFixture.enableIcon());
    await selectNew.locator("img").waitFor();
    assert.match(await selectNew.locator("img").getAttribute("src"), /\/api\/v1\/code\/visualizations\/new\/icon$/);
    await selectNew.click();
    await panel.getByRole("textbox", { name: "Chart caption", exact: true }).waitFor();
    assert.equal(await panel.getByRole("textbox", { name: "Chart caption", exact: true }).inputValue(), "Plugin default");
    assert.equal(await panel.getByRole("textbox", { name: "Notes", exact: true }).count(), 0);
    await panel.getByRole("switch", { name: "Show values", exact: true }).uncheck();
    await panel.getByRole("textbox", { name: "Notes", exact: true }).fill("Literal <script> text");
    await page.waitForFunction(() => window.__descriptorFixture.snapshot().params.notes === "Literal <script> text");
    await panel.getByRole("textbox", { name: "Chart caption", exact: true }).fill("My reusable chart");
    await panel.getByRole("tab", { name: "STYLES", exact: true }).click();
    await panel.getByRole("textbox", { name: "Bar color", exact: true }).fill("red");
    await panel.getByText("Use a six-digit hex color, for example #1976d2.", { exact: true }).waitFor();
    await panel.getByRole("textbox", { name: "Bar color", exact: true }).fill("#aabbcc");
    assert.equal(await panel.getByLabel("Bar color color picker", { exact: true }).inputValue(), "#aabbcc");
    await panel.getByRole("combobox", { name: "Direction", exact: true }).click();
    await page.getByRole("option", { name: "Vertical", exact: true }).click();
    await panel.getByRole("combobox", { name: "Typed choice", exact: true }).click();
    await page.getByRole("option", { name: "Text false", exact: true }).click();
    await page.waitForFunction(() => window.__descriptorFixture.snapshot().params.typedChoice === "false");
    await panel.getByRole("combobox", { name: "Typed choice", exact: true }).click();
    await page.getByRole("option", { name: "Zero", exact: true }).click();
    await page.waitForFunction(() => window.__descriptorFixture.snapshot().params.typedChoice === 0);
    const group = panel.getByRole("combobox", { name: "Series", exact: true });
    await group.click();
    await page.getByRole("option", { name: "Group B", exact: true }).click();
    const color = panel.getByRole("textbox", { name: "Color", exact: true });
    await color.fill("#15ab90");
    await page.waitForFunction(() => window.__descriptorFixture.snapshot().params.seriesColors
      .some(({ key, color }) => key === "Group B" && color === "#15ab90"));
    await group.click();
    await page.getByRole("option", { name: "Group A", exact: true }).click();
    await color.fill("#9f8621");
    await page.waitForFunction(() => window.__descriptorFixture.snapshot().params.seriesColors.length === 2);
    await panel.getByRole("button", { name: "Reset color", exact: true }).click();
    await page.waitForFunction(() => window.__descriptorFixture.snapshot().params.seriesColors.length === 1 &&
      window.__descriptorFixture.snapshot().params.seriesColors[0].key === "Group B");
    await panel.getByRole("tab", { name: "FILTERS", exact: true }).click();
    await panel.getByText("3 of 3 included", { exact: true }).waitFor();
    const categories = panel.getByRole("combobox", { name: "Visible categories", exact: true });
    await categories.click();
    await categories.fill("Beta");
    await page.getByRole("option", { name: "Beta", exact: true }).click();
    await page.waitForFunction(() => window.__descriptorFixture.snapshot().params.hiddenCategories.join() === "Beta");
    await categories.fill("Alpha");
    await page.getByRole("option", { name: "Alpha", exact: true }).click();
    await categories.fill("Gamma");
    const lastCategory = page.getByRole("option", { name: "Gamma", exact: true });
    await lastCategory.waitFor();
    assert.equal(await lastCategory.getAttribute("aria-disabled"), "true");
    await categories.press("Escape");
    const limit = panel.getByRole("spinbutton", { name: "Number of values", exact: true });
    assert.equal(await limit.inputValue(), "10");
    await limit.fill("");
    await panel.getByText("Enter a valid number.", { exact: true }).waitFor();
    await limit.fill("22");
    await panel.getByText("Use 20 or less.", { exact: true }).waitFor();
    await limit.fill("3.5");
    await panel.getByText("Use increments of 1.", { exact: true }).waitFor();
    await limit.fill("8");
    await page.waitForFunction(() => window.__descriptorFixture.snapshot().params.limit === 8);
    assert.equal(await limit.getAttribute("aria-invalid"), "false");
    await page.getByRole("button", { name: "Close panel", exact: true }).click();
    await page.getByRole("button", { name: "Reopen panel", exact: true }).click();
    await panel.getByRole("textbox", { name: "Chart caption", exact: true }).waitFor();
    assert.equal(await panel.getByRole("textbox", { name: "Chart caption", exact: true }).inputValue(), "My reusable chart");
    assert.equal(await panel.getByRole("switch", { name: "Show values", exact: true }).isChecked(), false);
    await panel.getByRole("tab", { name: "FILTERS", exact: true }).click();
    assert.equal(await limit.inputValue(), "8", "Reopening controls preserves edited values instead of reapplying defaults");
    await panel.getByText("1 of 3 included", { exact: true }).waitFor();
    await panel.getByRole("button", { name: "Show all categories", exact: true }).click();
    await panel.getByText("3 of 3 included", { exact: true }).waitFor();
    await panel.getByRole("tab", { name: "STYLES", exact: true }).click();
    await group.click();
    await page.getByRole("option", { name: "Group B", exact: true }).click();
    assert.equal(await color.inputValue(), "#15ab90", "A color is stored with its series name across panel toggles");
    await panel.getByRole("button", { name: "Reset all colors", exact: true }).click();
    await page.waitForFunction(() => window.__descriptorFixture.snapshot().params.seriesColors.length === 0);
    await page.evaluate(() => window.__descriptorFixture.unsupported());
    await panel.getByRole("tab", { name: "ELEMENTS", exact: true }).click();
    await panel.getByRole("alert").filter({ hasText: "Some customization controls require a newer OpenLAP version." }).waitFor();
    for (const width of [390, 768, 1280]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "Descriptor controls stay within the viewport at " + width);
    }
    await page.getByRole("button", { name: /^Existing bar chart\./ }).click();
    await panel.getByRole("switch", { name: "Show legend", exact: true }).waitFor();
    assert.equal(await panel.getByRole("textbox", { name: "Chart caption", exact: true }).count(), 0);
    const review = page.getByTestId("runtime-review");
    await review.getByRole("region", { name: "Browser runtime and customizations", exact: true }).waitFor();
    await review.getByText("org.openlap.fixture", { exact: true }).waitFor();
    await review.getByText("Version 2.4.0", { exact: true }).waitFor();
    const ordered = await review.locator("ol li").allTextContents();
    assert.ok(ordered[0].includes("web/native-2.4.0.css") && ordered[1].includes("web/native-2.4.0.js"), "Admin review preserves the declared asset loading order");
    await review.getByText("Chart caption · Text", { exact: true }).waitFor();
    await review.getByText("Default: Plugin default", { exact: true }).waitFor();
    await review.getByText("Shown when Show values is Off.", { exact: true }).waitFor();
    await review.getByRole("heading", { name: "Styles", exact: true }).waitFor();
    await review.getByRole("heading", { name: "Filters", exact: true }).waitFor();
    await review.getByRole("button").filter({ hasText: "Reusable line chart" }).click();
    await review.getByText("This chart declares no customization controls.", { exact: true }).waitFor();
    if (process.env.OPENLAP_DESCRIPTOR_PROOF_DIR) {
      await fs.mkdir(process.env.OPENLAP_DESCRIPTOR_PROOF_DIR, { recursive: true });
      await review.screenshot({ path: path.join(process.env.OPENLAP_DESCRIPTOR_PROOF_DIR, "plugin-runtime-review-desktop.png") });
    }
    await page.setViewportSize({ width: 390, height: 1000 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "Long asset hashes and review metadata wrap on mobile");
    if (process.env.OPENLAP_DESCRIPTOR_PROOF_DIR) {
      await review.screenshot({ path: path.join(process.env.OPENLAP_DESCRIPTOR_PROOF_DIR, "plugin-runtime-review-mobile.png") });
    }
    await page.evaluate(() => window.__descriptorFixture.legacyReview());
    await review.getByRole("alert").filter({ hasText: "This JAR has no browser runtime manifest." }).waitFor();
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    assert.deepEqual(iconRequests.sort(), ["/api/v1/code/visualizations/broken/icon", "/api/v1/code/visualizations/new/icon"]);
    console.log("PASS: reusable chart visibility and declared icons; native controls/defaults/validation; readable admin runtime review; mobile layout; legacy fallback; only approved icon requests");
    await context.close();
  } catch (error) {
    console.error(serverOutput.slice(-2000));
    throw error;
  } finally {
    if (browser) await browser.close();
    if (server && server.exitCode == null) { server.kill("SIGTERM"); await new Promise((resolve) => server.once("exit", resolve)); }
    await fs.rm(fixturePath, { force: true });
    await fs.rm(htmlPath, { force: true });
    await fs.rm(temporary, { recursive: true, force: true });
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
