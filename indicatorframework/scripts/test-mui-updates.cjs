// Exercise the real migrated controls with synthetic providers on loopback.
// NODE_PATH=/path/to/playwright/node_modules node scripts/test-mui-updates.cjs
// OPENLAP_TEST_PRODUCTION=1 also checks the isolated production bundle.
// WebKit only; the fixture blocks API traffic and every non-loopback origin.
const { webkit } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const appRoot = path.resolve(__dirname, "..");
const production = process.env.OPENLAP_TEST_PRODUCTION === "1";
const port = Number(process.env.OPENLAP_MUI_TEST_PORT || 5185);
const base = new URL(`http://127.0.0.1:${port}`);
const fixtureName = `.mui-updates-${process.pid}.jsx`;
const fixturePath = path.join(__dirname, fixtureName);
const htmlName = `mui-updates-${process.pid}.html`;
const htmlPath = path.join(appRoot, htmlName);
const fixtureSource = String.raw`
import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { MemoryRouter } from "react-router-dom";
import { SnackbarProvider } from "notistack";
import { AuthContext } from "/src/setup/auth-context-manager/auth-context-manager.jsx";
import { BasicContext } from "/src/pages/indicators/indicator-editor/basic-indicator/basic-indicator.jsx";
import { ISCContext } from "/src/pages/indicator-specification-cards/creator/isc-context.js";
import { createAppTheme } from "/src/common/theme/app-theme.js";
import DateFilter from "/src/pages/indicators/indicator-editor/basic-indicator/components/filters/components/date-filter.jsx";
import ActivityTypeSelection from "/src/pages/indicators/indicator-editor/basic-indicator/components/filters/components/activity-filters/activity-type-selection.jsx";
import GoalList from "/src/pages/indicator-specification-cards/creator/components/specify-requirements/components/specify-goal/goal-list.jsx";
import ChartCustomizationPanel from "/src/pages/indicators/indicator-editor/basic-indicator/components/visualization/components/customization/chart-customization-panel.jsx";
import FiltersTab from "/src/pages/indicator-specification-cards/creator/components/finalize/components/customization-panel/components/filters-tab.jsx";
import CatalogStatusControl from "/src/pages/admin/components/catalog-status-control.jsx";
import AddColumnDialog from "/src/pages/indicator-specification-cards/creator/components/dataset/components/add-column-dialog.jsx";

const activityTypes = [{ id: "material", name: "Materials" }, { id: "video", name: "Videos" }];
const chartConfiguration = { chartTitleAvailable: true, categoriesFilteringAvailable: true, sortingOrderChangeable: true };
const api = {
  get: async (url) => {
    if (url !== "v1/analytics/goals") throw Error("Unexpected synthetic API path: " + url);
    return { data: { data: [{ id: "goal-a", verb: "Compare outcomes" }] } };
  },
  post: async (url) => {
    if (url !== "v1/statements/actions") throw Error("Unexpected synthetic API path: " + url);
    await new Promise((resolve) => setTimeout(resolve, 150));
    return { data: { data: [{ id: "view", name: "Viewed" }] } };
  },
};
function Fixture() {
  const [dark, setDark] = useState(false);
  const theme = useMemo(() => createAppTheme(createTheme({ palette: { mode: dark ? "dark" : "light" } })), [dark]);
  const [filters, setFilters] = useState({
    selectedTime: { from: "2026-01-12T12:00:00.000Z", until: "2026-02-15T12:00:00.000Z" },
    activityTypesList: activityTypes,
    selectedActivities: [{ id: "activity-a", selectedActivityType: activityTypes[0], selectedActionList: [], actionList: [] }],
  });
  const [analysis, setAnalysis] = useState({ analyzedData: { item_name: { data: ["Alpha", "Beta", "Gamma"] } } });
  const [visualization, setVisualization] = useState({ selectedType: { id: "bar", chartConfiguration }, params: {} });
  const [requirements, setRequirements] = useState({ goalType: null, data: [] });
  const [enabled, setEnabled] = useState(true);
  const [addColumn, setAddColumn] = useState(false);
  const [iscChart, setIscChart] = useState({
    configuration: { isCategoriesFilteringAvailable: true },
    options: { xaxis: { categories: ["Alpha", "Beta", "Gamma"] } },
    series: [{ name: "Values", data: [1, 2, 3] }],
  });
  window.__muiFixture = { snapshot: () => ({ filters, analysis, visualization, requirements, enabled, iscChart }) };
  return <MemoryRouter><ThemeProvider theme={theme}><SnackbarProvider>
    <AuthContext.Provider value={{ api }}>
      <ISCContext.Provider value={{ requirements, setRequirements, dataset: { rows: [], columns: [] } }}>
        <BasicContext.Provider value={{ filters, setFilters, analysis, setAnalysis, visualization, setVisualization,
          dataset: { selectedLRSList: [] } }}>
          <nav><button onClick={() => setDark((v) => !v)}>Toggle theme</button>
            <button onClick={() => setAddColumn(true)}>Add data column</button></nav>
          <section data-testid="date-filter"><DateFilter /></section>
          <section data-testid="activity-type"><ActivityTypeSelection activity={filters.selectedActivities[0]} /></section>
          <section data-testid="goal-list"><GoalList /></section>
          <section data-testid="basic-customization"><ChartCustomizationPanel /></section>
          <section data-testid="isc-categories"><FiltersTab state={iscChart} setState={setIscChart} /></section>
          <section data-testid="catalog"><CatalogStatusControl enabled={enabled} name="Synthetic method" onChange={setEnabled} /></section>
          <AddColumnDialog open={addColumn} toggleOpen={() => setAddColumn((v) => !v)} />
        </BasicContext.Provider>
      </ISCContext.Provider>
    </AuthContext.Provider>
  </SnackbarProvider></ThemeProvider></MemoryRouter>;
}
createRoot(document.getElementById("fixture")).render(<Fixture />);
`;

async function controlChecks(page) {
  const goal = page.getByTestId("goal-list").getByRole("combobox", { name: "I want to", exact: true });
  await goal.fill("Compare");
  await page.getByRole("option", { name: "Compare outcomes", exact: true }).click();
  await page.waitForFunction(() => window.__muiFixture.snapshot().requirements.goalType?.id === "goal-a");
  assert.equal(await page.getByTestId("goal-list").locator('.MuiInputBase-root > svg').count(), 1, "Goal search adornment survives slot migration");
  await page.getByTestId("goal-list").getByRole("button", { name: "Clear", exact: true }).click();
  await goal.fill("Inspect engagement");
  await page.getByRole("option", { name: /Create goal.*Inspect engagement/ }).click();
  await page.waitForFunction(() => window.__muiFixture.snapshot().requirements.goalType?.verb === "Inspect engagement");

  const activity = page.getByTestId("activity-type");
  await activity.getByRole("combobox", { name: "Activity type", exact: true }).fill("Vid");
  await page.getByRole("option", { name: /Videos/ }).click();
  await activity.getByRole("progressbar").waitFor();
  await page.waitForFunction(() => window.__muiFixture.snapshot().filters.selectedActivities[0].selectedActivityType.id === "video");
  assert.equal(await activity.getByRole("button", { name: "Open", exact: true }).count(), 1, "Autocomplete popup adornment survives the loading spinner");
  assert.equal(await activity.getByRole("combobox", { name: "Activity type", exact: true }).inputValue(), "Videos");

  const catalog = page.getByTestId("catalog");
  await catalog.getByRole("switch", { name: "Disable Synthetic method", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Confirm", exact: true }).click();
  await page.waitForFunction(() => !window.__muiFixture.snapshot().enabled);
  assert.equal(await catalog.getByRole("switch", { name: "Enable Synthetic method", exact: true }).isChecked(), false);

  await page.getByRole("button", { name: "Add data column", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Add column", exact: true });
  const name = dialog.getByRole("textbox", { name: "Column name", exact: true });
  await name.fill("Score");
  const type = dialog.getByRole("combobox", { name: "Data type", exact: true });
  await type.click();
  await page.getByRole("option", { name: /^Numerical/ }).click();
  await dialog.getByRole("spinbutton", { name: "Number of rows", exact: true }).fill("2");
  assert.equal(await dialog.locator('label').filter({ hasText: "Column name" }).getAttribute("data-shrink"), "true");
  await dialog.getByRole("button", { name: "Add column", exact: true }).click();
  await page.waitForFunction(() => window.__muiFixture.snapshot().requirements.data.some((col) => col.value === "Score" && col.type.type === "number"));
  console.log("PASS: goal selection/custom goals/search adornment, labelled activity loading/popup, switch confirmation and column field slots");
}

async function dateAndLayoutChecks(page) {
  const dates = page.getByTestId("date-filter");
  const start = dates.getByRole("group", { name: "Start date", exact: true });
  const end = dates.getByRole("group", { name: "End date", exact: true });
  await start.waitFor();
  assert.equal(await start.getByRole("spinbutton").count(), 3, "v9 accessible date sections are present");
  const first = await start.boundingBox(), second = await end.boundingBox();
  assert.ok(Math.abs(first.y - second.y) < 2 && second.x > first.x, "Desktop dates stay side by side");
  assert.equal(await dates.getByText("Timeframe", { exact: true }).evaluate((el) => getComputedStyle(el).fontWeight), "600");
  assert.equal(await start.evaluate((el) => getComputedStyle(el.parentElement.parentElement).gap), "16px");
  await dates.getByRole("button", { name: /Choose date/ }).first().click();
  await page.getByRole("gridcell").filter({ hasText: /^20$/ }).click();
  await page.waitForFunction(() => window.__muiFixture.snapshot().filters.selectedTime.from.startsWith("2026-01-20"));
  await page.keyboard.press("Escape");
  assert.deepEqual(await page.evaluate(() => window.__muiFixture.snapshot().analysis.analyzedData), {});
  await page.setViewportSize({ width: 390, height: 1000 });
  const mobileFirst = await start.boundingBox(), mobileSecond = await end.boundingBox();
  assert.ok(mobileSecond.y > mobileFirst.y + mobileFirst.height, "Mobile dates stack vertically with spacing");
  assert.equal(await dates.evaluate((el) => el.getBoundingClientRect().right <= window.innerWidth), true, "Timeframe controls fit a mobile viewport");
  await page.setViewportSize({ width: 1200, height: 1000 });
  console.log("PASS: accessible Dayjs date selection, analysis reset, typography/gap styling and desktop/mobile layout");
}

async function customizationChecks(page) {
  const panel = page.getByTestId("basic-customization");
  await panel.getByRole("tab", { name: "ELEMENTS", exact: true }).click();
  await panel.getByRole("textbox", { name: "Chart title", exact: true }).fill("Migrated chart title");
  await page.waitForFunction(() => window.__muiFixture.snapshot().visualization.params.chartTitle === "Migrated chart title");
  const styles = panel.getByRole("tab", { name: "STYLES", exact: true });
  await styles.focus();
  await page.keyboard.press("ArrowRight");
  const filters = panel.getByRole("tab", { name: "FILTERS", exact: true });
  assert.equal(await filters.evaluate((el) => document.activeElement === el), true, "Lab tabs retain keyboard navigation");
  await page.keyboard.press("Enter");
  await panel.getByRole("combobox", { name: "Categories Filter", exact: true }).click();
  await page.getByRole("option", { name: "Beta", exact: true }).click();
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => window.__muiFixture.snapshot().visualization.params.hiddenCategoriesIndexes?.includes("1"));
  assert.equal(await panel.locator('.MuiChip-label').filter({ hasText: /^Beta$/ }).count(), 0, "Basic category renderValue removes the selected chip");

  const isc = page.getByTestId("isc-categories");
  await isc.getByRole("combobox", { name: "Categories Filter", exact: true }).click();
  await page.getByRole("option", { name: "Gamma", exact: true }).click();
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => window.__muiFixture.snapshot().iscChart.options.xaxis.categories.length === 2);
  assert.deepEqual(await page.evaluate(() => window.__muiFixture.snapshot().iscChart.series[0].data), [1, 2]);
  assert.equal(await isc.locator('.MuiChip-label').filter({ hasText: /^Gamma$/ }).count(), 0, "ISC category renderValue removes the selected chip");
  await page.getByRole("button", { name: "Toggle theme", exact: true }).click();
  assert.equal(await panel.getByRole("tab", { name: "FILTERS", exact: true }).getAttribute("aria-selected"), "true");
  console.log("PASS: lab tab keyboard navigation, title updates, both category renderValue callbacks and dark-theme rerender");
}

(async () => {
  let server, browser, page, outDir, fixtureWritten = false, htmlWritten = false;
  const failures = [], requests = [];
  try {
    await fs.writeFile(fixturePath, fixtureSource, { flag: "wx" });
    fixtureWritten = true;
    await fs.writeFile(htmlPath, `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
      <meta http-equiv="Content-Security-Policy" content="connect-src 'self';"><title>MUI migration fixture</title></head>
      <body style="margin:16px"><main id="fixture" style="display:grid;gap:24px;min-width:0"></main>
      <script type="module" src="/scripts/${fixtureName}"></script></body></html>`, { flag: "wx" });
    htmlWritten = true;
    const { build, createServer, preview } = await import("vite");
    const config = { root: appRoot, configFile: path.join(appRoot, "vite.config.js"), logLevel: "warn" };
    if (production) {
      outDir = await fs.mkdtemp(path.join(os.tmpdir(), "openlap-mui-production-"));
      const buildConfig = { ...config, build: { outDir, emptyOutDir: true, rolldownOptions: { input: htmlPath } } };
      await build(buildConfig);
      server = await preview({ ...buildConfig, preview: { host: "127.0.0.1", port, strictPort: true, open: false } });
    } else {
      server = await createServer({ ...config, server: { host: "127.0.0.1", port, strictPort: true, hmr: false, open: false } });
      await server.listen();
    }
    browser = await webkit.launch({ headless: true,
      ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) });
    const context = await browser.newContext({ viewport: { width: 1200, height: 1000 }, timezoneId: "UTC", serviceWorkers: "block" });
    await context.route("**/*", (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== base.origin || url.pathname.startsWith("/api/")) {
        failures.push("Blocked unexpected request: " + url.origin + url.pathname);
        return route.abort();
      }
      requests.push(url.pathname);
      return route.continue();
    });
    await context.routeWebSocket(/.*/, (socket) => socket.close());
    page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on("pageerror", (error) => failures.push(error.message));
    await page.goto(new URL(htmlName, base).href);
    await controlChecks(page);
    await customizationChecks(page);
    await dateAndLayoutChecks(page);
    if (production) {
      assert.ok(requests.some((p) => /^\/assets\/.+\.js$/.test(p)), "Load the production bundle");
      assert.equal(requests.some((p) => /^\/(src|scripts|node_modules|@vite|@react-refresh)(\/|$)/.test(p)), false);
    }
    assert.deepEqual(failures, [], "No browser exceptions or unexpected traffic");
    console.log(`PASS: MUI v9 ${production ? "production" : "development"} WebKit checks; all traffic stayed on loopback`);
  } catch (error) {
    if (failures.length) console.error("Browser diagnostics:", failures);
    if (page) console.error("Fixture diagnostics:", await page.evaluate(() => ({ text: document.body.innerText.slice(0, 1800), snapshot: window.__muiFixture?.snapshot() })).catch(() => "Page unavailable"));
    throw error;
  } finally {
    try { if (browser) await browser.close(); }
    finally {
      try { if (server) await server.close(); }
      finally {
        await Promise.all([
          ...(fixtureWritten ? [fs.rm(fixturePath, { force: true })] : []),
          ...(htmlWritten ? [fs.rm(htmlPath, { force: true })] : []),
          ...(outDir ? [fs.rm(outDir, { recursive: true, force: true })] : []),
        ]);
      }
    }
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
