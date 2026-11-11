// Start Vite on loopback, then run with an externally installed Playwright:
// NODE_PATH=/path/to/playwright/node_modules OPENLAP_TEST_BASE_URL=http://127.0.0.1:5181 \
//   node scripts/test-dependency-updates.cjs
// Uses WebKit only. No application server, account, or live API is needed.
const { webkit } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");

const base = new URL(process.env.OPENLAP_TEST_BASE_URL || "http://127.0.0.1:5181");
assert.equal(base.protocol, "http:");
assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(base.hostname));
assert.equal(base.username + base.password + base.search + base.hash, "");

// A temporary Vite module lets the normal JSX/dependency transforms load the
// real components. It is removed even when a check fails; no manifest changes.
const fixtureName = `.dependency-updates-${process.pid}.jsx`;
const fixturePath = path.join(__dirname, fixtureName);
const fixtureSource = String.raw`
import React, { StrictMode, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import Chart from "react-apexcharts";
import ApexCharts from "apexcharts";
import Papa from "papaparse";
import DataTableManager from "/src/pages/indicator-specification-cards/creator/components/dataset/data-table-manager/data-table-manager.jsx";
import BarChart from "/src/pages/indicator-specification-cards/creator/components/finalize/components/bar-chart.jsx";
import { ISCContext } from "/src/pages/indicator-specification-cards/creator/isc-context.js";
import { CustomThemeContext } from "/src/setup/theme-manager/theme-context-manager.jsx";

const categorical = { value: "Categorical", type: "string" };
const numerical = { value: "Numerical", type: "number" };
const freshDataset = () => ({
  file: { name: "" },
  columns: [
    { field: "category", headerName: "Category", type: "string", dataType: categorical, editable: true, width: 260 },
    { field: "value", headerName: "Value", type: "number", dataType: numerical, editable: true, width: 220 },
  ],
  rows: [
    { id: "row-a", category: "", value: 1 },
    { id: "row-b", category: "Beta", value: 2 },
    { id: "row-c", category: "Gamma", value: 3 },
  ],
});
const freshRequirements = () => ({ data: [
  { id: "category", value: "Category", type: categorical },
  { id: "value", value: "Value", type: numerical },
] });
const initialVisualization = () => ({
  chart: { code: "bar" }, edit: false,
  data: { series: [], options: {}, axisOptions: {
    xAxisOptions: [], yAxisOptions: [], selectedXAxis: "", selectedYAxis: "",
  } },
});
function WrapperCharts() {
  // The same standard ref emulates the app's two-chart transition pattern.
  // The two supported imperative refs must stay separate.
  const ignoredRef = useRef(null), firstRef = useRef(null), secondRef = useRef(null);
  const [second, setSecond] = useState(true);
  const [values, setValues] = useState([1, 2]);
  const [formatterUpdated, setFormatterUpdated] = useState(false);
  window.__dependencyChartRefs = [firstRef, secondRef];
  const options = (id) => ({
    chart: { id, animations: { enabled: false }, toolbar: { show: false } },
    xaxis: { categories: ["Alpha", "Beta"] },
    tooltip: { y: { formatter: formatterUpdated ? (v) => "updated " + v : (v) => "original " + v } },
  });
  return <section data-testid="wrapper-charts">
    <button onClick={() => setValues([4, 5])}>Update chart data</button>
    <button onClick={() => setFormatterUpdated(true)}>Update chart formatter</button>
    <button onClick={() => setSecond(false)}>Unmount second chart</button>
    <Chart ref={ignoredRef} chartRef={firstRef} type="bar" width={450} height={280}
      options={options("dependency-first")} series={[{ name: "Values", data: values }]} />
    {second && <Chart ref={ignoredRef} chartRef={secondRef} type="line" width={450} height={280}
      options={options("dependency-second")} series={[{ name: "Values", data: values }]} />}
  </section>;
}

function Fixture() {
  const [dataset, setDataset] = useState(freshDataset);
  const [requirements, setRequirements] = useState(freshRequirements);
  const [visRef, setVisRef] = useState(initialVisualization);
  const [view, setView] = useState("grid");
  const [customize, setCustomize] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const theme = useMemo(() => createTheme({ palette: { mode: darkMode ? "dark" : "light" } }), [darkMode]);
  window.__dependencyFixture = {
    snapshot: () => ({ dataset, requirements, visRef, darkMode }),
    chart: (id) => ApexCharts.getChartByID(id),
    parse: (input) => Papa.parse(input, { header: true, dynamicTyping: true }),
  };
  const showAppChart = () => {
    const next = freshDataset(); next.rows[0].category = "Alpha";
    setDataset(next); setVisRef(initialVisualization()); setCustomize(false); setView("app-chart");
  };
  return <ThemeProvider theme={theme}>
    <CustomThemeContext.Provider value={{ darkMode, theme }}>
      <ISCContext.Provider value={{ id: "synthetic-dependency-fixture", dataset, setDataset,
        requirements, setRequirements, visRef, setVisRef }}>
        <nav style={{ marginBottom: 16 }}>
          <button onClick={() => setView("grid")}>Show grid fixture</button>
          <button onClick={() => setDataset({ ...freshDataset(), rows: Array.from({ length: 13 }, (_, i) =>
            ({ id: "page-" + (i + 1), category: "Category " + (i + 1), value: i + 1 })) })}>Load pagination fixture</button>
          <button onClick={showAppChart}>Show app chart fixture</button>
          <button onClick={() => setView("wrapper")}>Show wrapper fixture</button>
          <button onClick={() => setDarkMode((v) => !v)}>Toggle dark mode</button>
        </nav>
        {view === "grid" && <section data-testid="dataset-grid"><DataTableManager /></section>}
        {view === "app-chart" && <section data-testid="app-chart">
          <BarChart customize={customize} handleToggleCustomizePanel={() => setCustomize((v) => !v)} />
        </section>}
        {view === "wrapper" && <StrictMode><WrapperCharts /></StrictMode>}
      </ISCContext.Provider>
    </CustomThemeContext.Provider>
  </ThemeProvider>;
}
createRoot(document.getElementById("fixture")).render(<Fixture />);
`;

async function selectionCount(page, count) {
  await page.waitForFunction((count) => {
    const text = document.querySelector('[data-testid="dataset-grid"]').textContent;
    return count === 0 ? !/\d+ row\(s\) selected/.test(text) : text.includes(count + " row(s) selected");
  }, count);
}

async function gridChecks(page) {
  const grid = page.getByTestId("dataset-grid");
  await grid.getByRole("grid").waitFor();
  const row = (id) => grid.locator(`.MuiDataGrid-row[data-id="${id}"]`);
  const firstCell = row("row-a").locator('[data-field="category"]');
  await firstCell.focus();
  await page.keyboard.type("Z");
  await page.waitForFunction(() => document.querySelector(
    '.MuiDataGrid-row[data-id="row-a"] [data-field="category"] input')?.value === "Z");
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => window.__dependencyFixture.snapshot().dataset.rows[0].category === "Z");

  await row("row-a").getByRole("checkbox").click();
  await selectionCount(page, 1);
  await row("row-b").getByRole("checkbox").click();
  await selectionCount(page, 2);
  await row("row-a").getByRole("checkbox").click();
  await selectionCount(page, 1);
  assert.equal(await row("row-a").getByRole("checkbox").isChecked(), false);
  await row("row-b").getByRole("checkbox").click();
  await selectionCount(page, 0);

  const selectAll = grid.getByRole("columnheader").filter({ has: page.getByRole("checkbox") }).getByRole("checkbox");
  await selectAll.click();
  await selectionCount(page, 3);
  assert.equal(await grid.locator('.MuiDataGrid-row input[type="checkbox"]:checked').count(), 3);
  await selectAll.click();
  await selectionCount(page, 0);

  await row("row-b").getByRole("checkbox").click();
  await grid.getByRole("button", { name: "Delete", exact: true }).click();
  await page.waitForFunction(() => window.__dependencyFixture.snapshot().dataset.rows.length === 2);
  assert.deepEqual(await page.evaluate(() => window.__dependencyFixture.snapshot().dataset.rows.map((r) => r.id)), ["row-a", "row-c"]);
  await selectionCount(page, 0);

  await grid.getByRole("columnheader", { name: /Category/ }).click();
  await page.getByRole("menuitem", { name: "Rename column", exact: true }).click();
  const rename = page.getByRole("dialog");
  await rename.getByRole("textbox", { name: "Column name", exact: true }).fill("Updated category");
  await rename.getByRole("button", { name: "Confirm", exact: true }).click();
  await page.waitForFunction(() => {
    const { dataset, requirements } = window.__dependencyFixture.snapshot();
    return dataset.columns[0].headerName === "Updated category" && requirements.data[0].value === "Updated category";
  });

  await page.getByRole("button", { name: "Load pagination fixture", exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll(".MuiDataGrid-row").length === 10);
  await grid.getByRole("button", { name: "Go to page 2", exact: true }).click();
  await row("page-11").waitFor();
  assert.equal(await grid.locator(".MuiDataGrid-row").count(), 3);
  await grid.getByRole("combobox").click();
  await page.getByRole("option", { name: "5 rows per page", exact: true }).click();
  await row("page-1").waitFor();
  assert.equal(await grid.locator(".MuiDataGrid-row").count(), 5);
  await selectAll.click();
  await selectionCount(page, 5);
  await selectAll.click();
  await selectionCount(page, 0);
  await grid.getByRole("combobox").click();
  await page.getByRole("option", { name: "20 rows per page", exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll(".MuiDataGrid-row").length === 13);

  await grid.getByRole("button", { name: "Reset", exact: true }).click();
  await page.getByRole("dialog", { name: "Reset dataset?", exact: true })
    .getByRole("button", { name: "Reset dataset", exact: true }).click();
  await page.waitForFunction(() => {
    const { dataset, requirements } = window.__dependencyFixture.snapshot();
    return dataset.rows.length === 0 && dataset.columns.length === 0 && requirements.data.length === 0 && dataset.file.name === "";
  });
  console.log("PASS: real DataTableManager edit, selection/count/delete, column rename, pagination/page size and reset");
}

async function chartChecks(page) {
  await page.getByRole("button", { name: "Show app chart fixture", exact: true }).click();
  const appChart = page.getByTestId("app-chart");
  await appChart.locator(".apexcharts-svg").first().waitFor();
  await page.waitForFunction(() => window.__dependencyFixture.snapshot().visRef.data.series[0]?.data.join() === "1,2,3");
  await page.getByRole("button", { name: "Toggle dark mode", exact: true }).click();
  await page.waitForFunction(() => window.__dependencyFixture.chart("bar")?.w.config.chart.foreColor === "#ffffff");
  // Exercise the real two-chart Grow transition and registry-backed StylesTab.
  for (let i = 0; i < 2; i++) {
    await appChart.getByRole("button", { name: "Customize chart", exact: true }).click();
    await appChart.getByRole("tab", { name: "style", exact: true }).click();
    await appChart.getByText("Data Colors", { exact: true }).waitFor();
    await appChart.getByRole("button", { name: "Close customization", exact: true }).click();
    await appChart.getByRole("button", { name: "Customize chart", exact: true }).waitFor();
  }
  await page.setViewportSize({ width: 1100, height: 1000 });

  await page.getByRole("button", { name: "Show wrapper fixture", exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="wrapper-charts"] .apexcharts-svg').length === 2);
  await page.waitForFunction(() => window.__dependencyChartRefs.every((ref) => Boolean(ref.current?.w)));
  await page.getByRole("button", { name: "Update chart data", exact: true }).click();
  await page.waitForFunction(() => window.__dependencyChartRefs.every((ref) => ref.current?.w.config.series[0].data.join() === "4,5"));
  await page.getByRole("button", { name: "Update chart formatter", exact: true }).click();
  await page.waitForFunction(() => window.__dependencyChartRefs.every((ref) => ref.current?.w.config.tooltip.y.formatter(4) === "updated 4"));
  await page.getByRole("button", { name: "Unmount second chart", exact: true }).click();
  await page.waitForFunction(() => window.__dependencyChartRefs[1].current === null &&
    Boolean(window.__dependencyChartRefs[0].current?.w) &&
    document.querySelectorAll('[data-testid="wrapper-charts"] .apexcharts-svg').length === 1);
  await page.getByRole("button", { name: "Show grid fixture", exact: true }).click();
  await page.waitForFunction(() => window.__dependencyChartRefs.every((ref) => ref.current === null));
  console.log("PASS: app chart theme/customization/remount/resize and React 19 wrapper refs, StrictMode, data/formatter updates and unmount");
}

async function csvChecks(page) {
  const result = await page.evaluate(() => ({
    ambiguous: window.__dependencyFixture.parse("name;value\nalpha,one,two;1\nbeta,one,two,three;2"),
    quoted: window.__dependencyFixture.parse('\ufeffname,value\r\n"alpha,beta",1\r\n"two\nlines",2'),
  }));
  assert.equal(result.ambiguous.meta.delimiter, ";");
  assert.deepEqual(result.ambiguous.errors, []);
  assert.deepEqual(result.ambiguous.data, [
    { name: "alpha,one,two", value: 1 }, { name: "beta,one,two,three", value: 2 },
  ]);
  assert.deepEqual(result.quoted.errors, []);
  assert.deepEqual(result.quoted.data, [{ name: "alpha,beta", value: 1 }, { name: "two\nlines", value: 2 }]);
  console.log("PASS: PapaParse delimiter consistency, quoted commas/newlines, BOM headers and dynamic typing");
}

(async () => {
  let browser, page;
  const failures = [];
  await fs.writeFile(fixturePath, fixtureSource, { flag: "wx" });
  try {
    browser = await webkit.launch({ headless: true,
      ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: "block" });
    await context.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== base.origin || url.pathname.startsWith("/api/")) {
        failures.push("Blocked unexpected request: " + url.origin + url.pathname);
        return route.abort();
      }
      if (url.pathname !== "/__dependency_updates__") return route.continue();
      return route.fulfill({ contentType: "text/html", body: `<!doctype html><html><head>
        <meta charset="utf-8"><title>Isolated dependency regression fixture</title>
        <meta http-equiv="Content-Security-Policy" content="connect-src 'self';">
        </head><body style="margin:24px"><main id="fixture"></main><script type="module">
        import RefreshRuntime from "/@react-refresh";
        RefreshRuntime.injectIntoGlobalHook(window);
        window.$RefreshReg$ = () => {};
        window.$RefreshSig$ = () => (type) => type;
        window.__vite_plugin_react_preamble_installed__ = true;
        await import("/scripts/${fixtureName}");
        </script></body></html>` });
    });
    // This fixture needs no sockets, including Vite hot reload.
    await context.routeWebSocket(/.*/, (socket) => socket.close());
    page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on("pageerror", (error) => failures.push(error.message));
    await page.goto(new URL("/__dependency_updates__", base).href);
    await gridChecks(page);
    await chartChecks(page);
    await csvChecks(page);
    assert.deepEqual(failures, [], "No browser errors or unexpected network requests");
    console.log("PASS: WebKit dependency regression checks; all traffic stayed on loopback");
  } catch (error) {
    if (failures.length) console.error("Browser diagnostics:", failures);
    if (page) console.error("Fixture diagnostics:", await page.evaluate(() => ({
      text: document.body.innerText.slice(0, 1200),
      inputs: [...document.querySelectorAll('[data-field="category"] input')].map((input) => input.value),
      rows: window.__dependencyFixture?.snapshot().dataset.rows,
    })).catch(() => "Page unavailable"));
    throw error;
  } finally {
    if (browser) await browser.close();
    await fs.unlink(fixturePath);
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
