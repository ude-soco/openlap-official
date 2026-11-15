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
import { getVisualizationDefaults } from "/src/pages/indicators/indicator-editor/basic-indicator/components/visualization/utils/visualization-descriptor.js";
import { defaultParams } from "/src/pages/indicators/indicator-editor/basic-indicator/components/visualization/utils/visualization-data.js";
const descriptor = {
  schemaVersion: 1, id: "new-chart", runtimeId: "native", description: "A new reusable chart.",
  customizations: [
    { id: "caption", label: "Chart caption", type: "text", group: "elements", defaultValue: "Plugin default" },
    { id: "showLabels", label: "Show values", type: "boolean", group: "elements", defaultValue: true },
    { id: "notes", label: "Notes", type: "text", group: "elements", defaultValue: "", visibleWhen: { id: "showLabels", equals: false } },
    { id: "fill", label: "Bar color", type: "color", group: "styles", defaultValue: "#1976d2" },
    { id: "direction", label: "Direction", type: "select", group: "styles", defaultValue: "horizontal", options: [
      { value: "horizontal", label: "Horizontal" }, { value: "vertical", label: "Vertical" } ] },
    { id: "limit", label: "Number of values", type: "number", group: "filters", min: 1, max: 20, step: 1, defaultValue: 10 },
  ],
};
const inputs = [{ id: "labels", type: "Text", required: true }, { id: "values", type: "Numeric", required: true }];
const newChart = { id: "new", name: "New reusable chart", imageCode: "UnknownPluginChart", chartInputs: inputs,
  chartConfiguration: {}, visualizationDescriptor: descriptor };
const legacyChart = { id: "legacy", name: "Existing bar chart", imageCode: "Bar", chartInputs: inputs,
  chartConfiguration: { showHideLegendAvailable: true, chartTitleAvailable: true } };
const columns = { category: { configurationData: { id: "category", type: "Text" }, data: ["Alpha"] },
  amount: { configurationData: { id: "amount", type: "Numeric" }, data: [4] } };
function Fixture() {
  const [visualization, setVisualization] = useState({ selectedType: legacyChart,
    params: getVisualizationDefaults(legacyChart, defaultParams), mapping: { mapping: [] } });
  const [open, setOpen] = useState(true);
  window.__descriptorFixture = { snapshot: () => visualization, unsupported: () => setVisualization((previous) => ({
    ...previous, selectedType: { ...previous.selectedType, visualizationDescriptor: { ...descriptor,
      customizations: [...descriptor.customizations, { id: "extension", type: "executable", group: "elements" }] } },
  })) };
  return <MemoryRouter><ThemeProvider theme={createAppTheme(createTheme())}><CssBaseline />
    <Stack component="main" sx={{ gap: 3, p: 2, maxWidth: 1100, mx: "auto" }}>
      <ChartTypeOptions types={[legacyChart, newChart]} analyzedData={columns} selectedTypeId={visualization.selectedType.id}
        onSelect={(chart) => setVisualization({ selectedType: chart,
          params: getVisualizationDefaults(chart, defaultParams), mapping: { mapping: [] } })} />
      <button onClick={() => setOpen((value) => !value)}>{open ? "Close panel" : "Reopen panel"}</button>
      <BasicContext.Provider value={{ visualization, setVisualization, analysis: { analyzedData: columns } }}>
        {open && <Stack data-testid="customization" sx={{ width: { xs: "100%", md: 340 } }}><ChartCustomizationPanel /></Stack>}
      </BasicContext.Provider>
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
    const errors = [], external = [];
    await context.route("**/*", (route) => {
      const url = new URL(route.request().url());
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
    await panel.getByRole("tab", { name: "FILTERS", exact: true }).click();
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
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    console.log("PASS: reusable chart visibility; native descriptor controls/defaults/conditional fields/validation; saved values; mobile layout; legacy fallback; no API/CDN traffic");
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
