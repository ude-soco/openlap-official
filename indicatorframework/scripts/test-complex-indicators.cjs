// UI contract fixture: all identities, datasets, plugin metadata and chart
// markup are synthetic. Real plugin/database execution is qualified separately.
// Start Vite with VITE_BACKEND_URL=/api/, then use the existing WebKit tools:
// OPENLAP_TEST_BASE_URL=http://127.0.0.1:15281 npm run test:complex-indicators
const { webkit } = require("playwright");
const assert = require("node:assert/strict");
const base = new URL(
  process.env.OPENLAP_TEST_BASE_URL || "http://127.0.0.1:5181",
);
assert.equal(base.protocol, "http:");
assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(base.hostname));

const port = (id, type, title = id) => ({ id, title, type, required: true });
const column = (config, data) => ({ configurationData: config, data });
const material = port("material", "Text", "Materials"),
  count = port("count", "Numeric", "Count");
const source = (id, name, method = "counts") => ({
  id,
  name,
  analyticsMethod: {
    id: method,
    name: method === "counts" ? "Count items" : "Other method",
  },
  outputs: [material, count],
  available: true,
  indicatorQuery: {
    duration: { from: "2026-01-01", until: "2026-11-01" },
    userQueryCondition: "INCLUDE_ME",
  },
});
const sources = [
  source("access", "Access count"),
  source("students", "Student count"),
  source("annotations", "Annotation count"),
  source("different", "Different method", "other"),
  {
    ...source("broken", "Unavailable plugin"),
    available: false,
    unavailableReason: "Plugin unavailable",
  },
];
const keys = [
  "Material 1",
  "Material 6",
  "Item 1",
  "Material 9",
  "Item 2",
  "Material 10",
  "Item 3",
  "Material 5",
];
const wide = {
  columns: {
    key: column(port("key", "Text", "Materials"), keys),
    source_access__count: column(
      port("source_access__count", "Numeric", "Access count · Count"),
      [860, 600, 553, 400, 320, 0, 0, 0],
    ),
    source_students__count: column(
      port("source_students__count", "Numeric", "Student count · Count"),
      [182, 175, 175, 0, 110, 160, 90, 50],
    ),
  },
  rowCount: 8,
  columnOrder: ["key", "source_access__count", "source_students__count"],
  filledCells: [
    {
      rowIndex: 3,
      columnId: "source_students__count",
      indicatorId: "students",
    },
    ...[5, 6, 7].map((rowIndex) => ({
      rowIndex,
      columnId: "source_access__count",
      indicatorId: "access",
    })),
  ],
  sources: [
    {
      indicatorId: "access",
      label: "Access count",
      inputRows: 5,
      includedRows: 5,
      excludedRows: 0,
    },
    {
      indicatorId: "students",
      label: "Student count",
      inputRows: 7,
      includedRows: 7,
      excludedRows: 0,
    },
  ],
};
wide.chartData = {
  columns: {
    combined_key: column(port("combined_key", "Text", "Materials"), [
      ...keys,
      ...keys,
    ]),
    combined_series: column(
      port("combined_series", "Text", "Source / measure"),
      [
        ...keys.map(() => "Access count · Count"),
        ...keys.map(() => "Student count · Count"),
      ],
    ),
    combined_value: column(port("combined_value", "Numeric", "Measure value"), [
      ...wide.columns.source_access__count.data,
      ...wide.columns.source_students__count.data,
    ]),
  },
};
const commonKeys = [
  "Material 1",
  "Material 6",
  "Item 1",
  "Material 9",
  "Item 2",
  "Material 4",
];
const intersection = {
  columns: {
    key: column(port("key", "Text", "Materials"), commonKeys),
    source_access__count: column(
      port("source_access__count", "Numeric", "Access count · Count"),
      [860, 600, 553, 400, 320, 126],
    ),
    source_annotations__count: column(
      port("source_annotations__count", "Numeric", "Annotation count · Count"),
      [43, 40, 35, 32, 22, 15],
    ),
  },
  rowCount: 6,
  sources: [
    {
      indicatorId: "access",
      label: "Access count",
      inputRows: 6,
      includedRows: 6,
      excludedRows: 0,
    },
    {
      indicatorId: "annotations",
      label: "Annotation count",
      inputRows: 7,
      includedRows: 6,
      excludedRows: 1,
    },
  ],
  filledCells: [],
};
const analysis = {
  columns: {
    attribute_1: column(
      port("attribute_1", "Numeric", "Access count"),
      [860, 600, 553, 400, 320, 126],
    ),
    attribute_2: column(
      port("attribute_2", "Numeric", "Annotations"),
      [43, 40, 35, 32, 22, 15],
    ),
    cluster_name: column(port("cluster_name", "Text", "Cluster"), [
      "Cluster 1",
      "Cluster 1",
      "Cluster 2",
      "Cluster 2",
      "Cluster 3",
      "Cluster 3",
    ]),
  },
};
const charts = [
  {
    id: "grouped",
    name: "Grouped bar",
    imageCode: "GroupBar",
    chartInputs: [
      port("category", "Text", "Materials"),
      port("group", "Text", "Series"),
      port("value", "Numeric", "Values"),
    ],
    chartConfiguration: { showHideLegendAvailable: true, chartTitleAvailable: true },
  },
  {
    id: "scatter",
    name: "Scatter plot",
    imageCode: "ScatterPlot",
    chartInputs: [
      port("x", "Numeric", "Horizontal values"),
      port("y", "Numeric", "Vertical values"),
      port("group", "Text", "Groups"),
    ],
    chartConfiguration: { showHideLegendAvailable: true, chartTitleAvailable: true },
  },
];
const chartMarkup =
  '<svg width="100%" height="350" viewBox="0 0 600 350" role="img" aria-label="Synthetic result chart"><title>Synthetic result chart</title><rect width="300" height="200" fill="blue" /></svg>';
const code = encodeURIComponent(
  `<div id="complex-test-chart"></div><script>document.getElementById("complex-test-chart").innerHTML=${JSON.stringify(chartMarkup)};</script>`,
);
const failures = [],
  pageErrors = [],
  saved = [],
  requests = [],
  previews = [],
  previewPlans = [];
const codeForPreview = (token) => encodeURIComponent(
  `<div id="complex-test-chart"></div><script>document.getElementById("complex-test-chart").innerHTML=${JSON.stringify(chartMarkup.replace('<svg ', '<svg data-preview-token="' + token + '" '))};</script>`,
);
const until = async (predicate, message) => {
  const deadline = Date.now() + 15000;
  while (!predicate()) {
    assert.ok(Date.now() < deadline, message);
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
};
let failMerge = true;
let failMethodContract = true;
let failUpdate = true;
let delayedDashboardModule = false;

(async () => {
  const browser = await webkit.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
      : {}),
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1000 },
  });
  try {
    await context.routeWebSocket(/.*/, (socket) => socket.close());
    const token =
      "e30." +
      Buffer.from(
        JSON.stringify({
          sub: "complex.fixture@example.test",
          roles: ["ROLE_USER"],
          exp: Math.floor(Date.now() / 1000) + 3600,
        }),
      ).toString("base64url") +
      ".fixture";
    await context.addInitScript(
      (token) =>
        localStorage.setItem(
          "authTokens",
          JSON.stringify({ access_token: token, refresh_token: token }),
        ),
      token,
    );
    await context.route("**/*", async (route) => {
      const request = route.request(),
        url = new URL(request.url());
      if (url.origin !== base.origin) {
        if (
          /^https:\/\/(cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|d3js\.org)\//.test(
            url.href,
          )
        )
          return route.fulfill({
            contentType: url.pathname.endsWith(".css")
              ? "text/css"
              : "application/javascript",
            body: "/* Unused synthetic fixture dependency. */",
          });
        failures.push("Unexpected off-origin request: " + url.origin);
        return route.abort();
      }
      if (url.pathname === "/src/pages/indicators/dashboard/indicator-editor-dashboard.jsx"
          && !delayedDashboardModule) {
        delayedDashboardModule = true;
        // Hold navigation beyond the recovery debounce while the old editor
        // remains mounted awaiting its lazy destination, as on a cold CI run.
        await new Promise((resolve) => setTimeout(resolve, 1100));
      }
      if (!url.pathname.startsWith("/api/")) return route.continue();
      const path = url.pathname.slice(5);
      requests.push(path);
      const body =
        request.method() === "POST" || request.method() === "PUT"
          ? request.postDataJSON()
          : null;
      const send = (data) =>
        route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({ data, message: "Synthetic fixture" }),
        });
      if (path === "v1/users/my")
        return send({
          name: "Complex fixture",
          email: "complex.fixture@example.test",
          roles: ["ROLE_USER"],
        });
      if (path === "v1/indicators/sources")
        return send({
          content: sources,
          totalPages: 1,
          totalElements: sources.length,
        });
      if (path === "v1/analytics/methods")
        return send([
          {
            id: "kmeans",
            name: "K-Means clusters",
            description: "Two numeric features",
          },
        ]);
      if (path === "v1/analytics/methods/input-params/kmeans") {
        if (failMethodContract) {
          failMethodContract = false;
          return route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({
              message:
                "Method inputs temporarily unavailable. Retry with your selection preserved.",
            }),
          });
        }
        return send({
          inputs: [
            port("attribute_1", "Numeric", "First feature"),
            port("attribute_2", "Numeric", "Second feature"),
          ],
          params: [
            {
              id: "clusters",
              title: "Number of clusters",
              type: "Textbox",
              dataType: "INTEGER",
              required: true,
              defaultValue: "3",
            },
          ],
        });
      }
      if (path === "v1/visualizations/libraries")
        return send([{ id: "library", name: "Synthetic charts" }]);
      if (path === "v1/visualizations/libraries/library/types")
        return send(charts);
      if (path === "v1/indicators/composite/merge") {
        assert.deepEqual(
          body.indicators.map((item) => item.indicatorId),
          ["access", "students"],
        );
        if (failMerge) {
          failMerge = false;
          return route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({
              message:
                "Source data temporarily unavailable. Retry without changing your selection.",
            }),
          });
        }
        return send(wide);
      }
      if (path === "v1/indicators/multilevel/merge")
        return send({ mergedData: intersection });
      if (path === "v1/indicators/multilevel/analyze") {
        assert.equal(body.analyticsTechniqueId, "kmeans");
        assert.deepEqual(
          body.analyticsTechniqueMapping.mapping.map(
            (item) => item.outputPort.id,
          ),
          ["source_access__count", "source_annotations__count"],
        );
        return send(analysis);
      }
      if (
        path === "v1/indicators/composite/preview" ||
        path === "v1/indicators/multilevel/preview"
      ) {
        const call = { path, body, token: `preview-${previews.length + 1}`, completed: false };
        const plan = previewPlans.shift() || {};
        previews.push(call);
        if (plan.delayMs) await new Promise((resolve) => setTimeout(resolve, plan.delayMs));
        try {
          if (plan.fail) {
            return await route.fulfill({ status: 503, contentType: "application/json",
              body: JSON.stringify({ message: "Chart service temporarily unavailable. Retry the preview." }) });
          }
          return await send(codeForPreview(call.token));
        } finally {
          call.completed = true;
        }
      }
      if (
        /^v1\/indicators\/(composite|multilevel)\/(create|[^/]+\/update)$/.test(
          path,
        )
      ) {
        if (request.method() === "PUT" && failUpdate) {
          failUpdate = false;
          return route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({ message: "Update temporarily unavailable. Retry your save." }),
          });
        }
        assert.equal(JSON.parse(body.configuration).type, body.indicatorType);
        assert.equal(JSON.parse(body.configuration).schemaVersion, 1);
        assert.equal(body.indicators.length, 2);
        saved.push({ path, ...body });
        return send(null);
      }
      if (path === "v1/indicators/my")
        return send({
          content: [
            ...saved.map((item, index) => ({
              id: "saved-" + index,
              name: item.name,
              indicatorName: item.name,
              type: item.indicatorType,
            })),
            { id: "access", indicatorName: "Access count", type: "BASIC" },
          ],
          totalElements: saved.length + 1,
          pageable: { pageSize: 10, pageNumber: 0 },
        });
      if (path === "v1/indicators/access/delete")
        return route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({
            code: "INDICATOR_IN_USE",
            message:
              "This indicator is used by a complex indicator. Remove or replace that source first.",
            details: {
              count: 1,
              usedBy: [
                {
                  id: "saved-0",
                  name: "Composite fixture <strong>literal</strong>",
                },
              ],
            },
          }),
        });
      if (path === "v1/indicators/saved-0")
        return send({
          id: "saved-0",
          name: saved[0].name,
          type: "COMPOSITE",
          configuration: saved[0].configuration,
          indicatorCode: code,
        });
      if (path === "v1/indicators/saved-0/result") return send(wide);
      failures.push("Unexpected API request: " + path);
      return route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ message: "Unexpected synthetic API request" }),
      });
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => pageErrors.push(error.message));
    const select = async (name) =>
      page.getByRole("button", { name: "Select " + name, exact: true }).click();
    const button = (name) => page.getByRole("button", { name, exact: true });
    const chooseLibrary = async () => {
      await page
        .getByRole("combobox", { name: "Visualization library", exact: true })
        .click();
      await page
        .getByRole("option", { name: "Synthetic charts", exact: true })
        .click();
    };
    const previewResults = () => page.getByRole("region", {
      name: "Preview results", exact: true,
    });
    const dataPreviewAction = () => previewResults().getByRole("button", {
      name: /^(Preview|Try again|Run preview again)$/,
    });
    const chartChoice = (name) => page.getByRole("button", {
      name: new RegExp("^" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\. "),
    });
    const assertContained = async (control, message) => {
      assert.match(await control.getAttribute("class"), /MuiButton-contained/, message);
      assert.doesNotMatch(await control.getAttribute("class"), /MuiButton-sizeSmall/,
        "Workflow actions keep the Basic editor's medium or large size");
    };
    const checkPreviewAction = async () => {
      const control = dataPreviewAction();
      await assertContained(control, "Preview actions use the Basic editor's primary contained button");
      const [action, card] = await Promise.all([control.boundingBox(), previewResults().boundingBox()]);
      assert.ok(Math.abs(action.x + action.width / 2 - card.x - card.width / 2) < 3,
        "Data-preview actions are centered in their results card");
    };
    const checkVisualizationDesign = async (name) => {
      const choice = chartChoice(name);
      const card = await choice.evaluate((element) => {
        const paper = element.closest(".MuiPaper-root");
        const icon = element.querySelector("svg");
        return {border: getComputedStyle(paper).borderTopColor, iconWidth: icon?.getBoundingClientRect().width};
      });
      assert.equal(card.border, "rgb(245, 124, 0)", "Chart selection uses the shared orange Basic border");
      assert.equal(card.iconWidth, 56, "Chart cards use the shared Basic icon size");
      const live = page.getByRole("region", {name: "Live preview", exact: true});
      const customize = live.getByRole("button", {name: "Customize chart", exact: true});
      await assertContained(customize, "Customize action uses the Basic primary button");
      assert.equal(await live.getByRole("button", {name: "Generate chart preview", exact: true}).count(), 0,
        "Chart previews generate automatically without an extra action");
      await customize.click();
      const panel = page.getByRole("region", {name: "Chart customization", exact: true});
      await panel.getByRole("tab", {name: "ELEMENTS", exact: true}).waitFor();
      let [plotBox, panelBox] = await Promise.all([live.boundingBox(), panel.boundingBox()]);
      assert.ok(panelBox.x >= plotBox.x + plotBox.width - 1, "Desktop customization sits beside the preview");
      assert.ok(Math.abs(panelBox.width - 340) < 2, "Customization uses the Basic side-panel width");
      await panel.getByRole("tab", {name: "STYLES", exact: true}).click();
      await page.setViewportSize({width: 390, height: 844});
      [plotBox, panelBox] = await Promise.all([live.boundingBox(), panel.boundingBox()]);
      assert.ok(panelBox.y >= plotBox.y + plotBox.height - 1, "Mobile customization stacks after the preview");
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2),
        "Customization and chart controls stay within mobile viewport");
      const close = panel.getByRole("button", {name: "Close customization", exact: true});
      await close.focus();
      await page.keyboard.press("Enter");
      await panel.waitFor({state: "detached"});
      await page.waitForFunction(() => /Customize chart/.test(document.activeElement?.textContent || ""));
      await page.setViewportSize({width: 1280, height: 1000});
      const save = button("Save indicator");
      await assertContained(save, "Save uses the same primary contained footer as Basic");
      const saveBox = await save.boundingBox();
      const sectionBox = await page.getByRole("region", {name:"Visualization step", exact:true}).boundingBox();
      assert.ok(saveBox.width < sectionBox.width * 0.6 && saveBox.width > sectionBox.width * 0.35,
        "Desktop Save footer stays centered at half width");
      assert.ok(Math.abs(saveBox.x + saveBox.width / 2 - sectionBox.x - sectionBox.width / 2) < 3,
        "Save footer is centered within the workflow frame");
    };
    const resultChart = () => page.getByRole("img", { name: "Synthetic result chart", exact: true });
    const waitForPreview = async (call) => {
      await until(() => call.completed, "Preview response completes");
      await page.waitForFunction((token) => document.querySelector('[data-preview-token]')?.getAttribute('data-preview-token') === token, call.token);
    };
    const generateChart = async (name) => {
      const before = previews.length;
      await chartChoice(name).click();
      await until(() => previews.length > before, "Selecting a chart automatically requests its preview");
      const call = previews.at(-1);
      await waitForPreview(call);
      await page.waitForTimeout(350);
      assert.equal(previews.length, before + 1, "One selection generates one preview, without a render loop");
    };
    const checkAutomaticUpdates = async (chartName, indicatorType) => {
      const mapping = page.getByRole("region", { name: "Configure chart", exact: true });
      const input = charts.find((chart) => chart.name === chartName).chartInputs[0];
      const selected = previews.at(-1).body.visualizationMapping.mapping.find((item) => item.inputPort.id === input.id).outputPort;
      const field = mapping.getByRole("combobox", { name: new RegExp("^" + input.title) });
      let before = previews.length;
      await field.click();
      await page.getByRole("option", { name: "Select a column", exact: true }).click();
      await page.waitForTimeout(800);
      assert.equal(previews.length, before, "An incomplete required chart mapping never requests a preview");
      assert.equal(await button("Save indicator").isDisabled(), true, "Incomplete mappings invalidate Save");
      assert.equal(await resultChart().count(), 0, "Incomplete mappings remove the previous chart");

      previewPlans.push({ fail: true });
      await field.click();
      await page.getByRole("option", { name: selected.title || selected.id, exact: true }).click();
      await until(() => previews.length === before + 1, "Restoring a required mapping refreshes automatically");
      await page.getByRole("alert").filter({ hasText: "Chart service temporarily unavailable" }).waitFor();
      assert.equal(await button("Save indicator").isDisabled(), true, "Failed previews do not enable Save");
      await page.waitForTimeout(900);
      assert.equal(previews.length, before + 1, "A failed automatic preview does not loop or retry itself");
      await button("Retry preview").click();
      await until(() => previews.length === before + 2, "Explicit retry requests one replacement preview");
      await waitForPreview(previews.at(-1));
      assert.equal(await button("Save indicator").isDisabled(), false, "Successful latest preview enables Save");

      const live = page.getByRole("region", { name: "Live preview", exact: true });
      await live.getByRole("button", { name: "Customize chart", exact: true }).click();
      const panel = page.getByRole("region", { name: "Chart customization", exact: true });
      const title = panel.getByRole("textbox", { name: "Chart title", exact: true });
      before = previews.length;
      previewPlans.push({ delayMs: 1500 });
      await title.fill(`${indicatorType} obsolete title`);
      await until(() => previews.length === before + 1, "Customization changes refresh automatically");
      const obsolete = previews.at(-1);
      assert.equal(obsolete.body.visualizationParams.chartTitle, `${indicatorType} obsolete title`);
      assert.equal(await button("Save indicator").isDisabled(), true, "Save waits for the latest in-flight preview");
      await title.fill(`${indicatorType} latest title`);
      await until(() => previews.length === before + 2, "Newer customization starts a replacement request");
      const latest = previews.at(-1);
      assert.equal(latest.body.visualizationParams.chartTitle, `${indicatorType} latest title`);
      await waitForPreview(latest);
      await until(() => obsolete.completed, "Obsolete delayed response has finished");
      await page.waitForTimeout(100);
      assert.equal(await resultChart().getAttribute("data-preview-token"), latest.token,
        "An obsolete response cannot replace the latest chart");
      assert.equal(await button("Save indicator").isDisabled(), false, "Only the latest successful chart enables Save");
      await panel.getByRole("button", { name: "Close customization", exact: true }).click();
      assert.equal(previews.length, before + 2, "Preview completion and panel closure do not generate more requests");
      before = previews.length;
      await chartChoice(chartName).click();
      await until(() => previews.length === before + 1, "Reselecting the same chart refreshes its invalidated preview");
      await waitForPreview(previews.at(-1));
    };
    const saveIndicator = async (name, update = false) => {
      const previewsBeforeSave = previews.length;
      await button(update ? "Review changes" : "Save indicator").click();
      const dialog = page.getByRole("dialog", {
        name: /(?:Save|Update) (?:composite|multilevel analysis) indicator/,
      });
      await dialog.getByRole("textbox", { name: "Indicator name" }).fill(name);
      await page.getByRole("status", { includeHidden: true })
        .filter({ hasText: "Saving in this tab…" }).waitFor();
      const saveAction = dialog.getByRole("button", {
        name: update ? "Update indicator" : "Save indicator", exact: true,
      });
      await saveAction.click();
      if (update) {
        await dialog.getByRole("alert").filter({ hasText: "Update temporarily unavailable" }).waitFor();
        await page.waitForFunction((name) => Object.keys(sessionStorage).some((key) =>
          key.startsWith("openlap:complex:") && key.endsWith(":saved-0")
          && JSON.parse(sessionStorage.getItem(key)).name === name,
        ), name);
        await saveAction.click();
      }
      await page.waitForURL("**/indicator");
      await page
        .getByRole("heading", { name: "My Indicators", exact: true })
        .waitFor();
      assert.equal(previews.length, previewsBeforeSave,
        "Editing only the indicator name and saving do not regenerate the chart");
    };

    await page.goto(new URL("/indicator/editor/composite", base).href);
    const interLoaded = await page.evaluate(async () => {
      await document.fonts.ready;
      const faces = await document.fonts.load("14px Inter");
      return faces.length > 0 && faces.every((face) => face.status === "loaded");
    });
    assert.ok(interLoaded, "Visual consistency is checked with the app's actual Inter font");
    const sourceSection = page.getByRole("region", {name:"Select indicators step", exact:true});
    await sourceSection.getByRole("button", {name:"Close", exact:true}).click();
    await button("Select Access count").waitFor({state:"detached"});
    await sourceSection.getByRole("button", {name:"Open", exact:true}).click();
    await select("Access count");
    assert.equal(
      await button("Select Different method").isDisabled(),
      true,
      "Composite excludes a different method",
    );
    assert.equal(
      await button("Select Unavailable plugin").isDisabled(),
      true,
      "Unavailable source stays readable but unselectable",
    );
    await select("Student count");
    await button("Continue to combine data").click();
    assert.equal(previews.length, 0, "No chart preview runs before combined result data is available");
    await checkPreviewAction();
    await dataPreviewAction().click();
    await page
      .getByRole("alert")
      .filter({ hasText: "Source data temporarily unavailable" })
      .waitFor();
    await dataPreviewAction().click();
    const combined = page.getByRole("region", {
      name: "Preview results",
      exact: true,
    });
    await combined.getByText("8 rows · 3 columns", { exact: true }).waitFor();
    await combined.getByText(/4 cells were filled with zero/).waitFor();
    await button("Continue to visualization").click();
    await chooseLibrary();
    await generateChart("Grouped bar");
    await checkAutomaticUpdates("Grouped bar", "COMPOSITE");
    await checkVisualizationDesign("Grouped bar");
    await saveIndicator("Composite fixture");
    assert.ok(delayedDashboardModule, "The first save waits for a cold lazy destination");
    assert.deepEqual(await page.evaluate(() => Object.keys(sessionStorage).filter(
      (key) => key.startsWith("openlap:complex:") && key.endsWith(":COMPOSITE:new"),
    )), [], "Successful save does not recreate its recovery draft during delayed navigation");
    assert.equal(saved[0].indicatorType, "COMPOSITE");
    assert.ok(
      saved[0].visualizationMapping.mapping.some(
        (item) => item.outputPort.id === "combined_series",
      ),
    );
    assert.equal(JSON.parse(saved[0].configuration).mergedData, undefined);

    await page.goto(new URL("/indicator/saved-0", base).href);
    await page
      .getByRole("region", { name: "Dataset", exact: true })
      .getByRole("cell", { name: "Material 1", exact: true })
      .waitFor();
    await page
      .getByRole("region", { name: "Source indicators", exact: true })
      .waitFor();
    const beforeEditPreviews = previews.length;
    await page.goto(
      new URL("/indicator/editor/composite/edit/saved-0", base).href,
    );
    await dataPreviewAction().waitFor();
    await page.waitForTimeout(800);
    assert.equal(previews.length, beforeEditPreviews,
      "Saved chart selections do not preview until their source result is recomputed");
    await page
      .getByRole("textbox", {
        name: "Series label for Access count",
        exact: true,
      })
      .fill("Recovered access label");
    await page.waitForFunction(() =>
      Object.keys(sessionStorage)
        .filter(
          (key) =>
            key.startsWith("openlap:complex:") && key.endsWith(":saved-0"),
        )
        .some(
          (key) =>
            JSON.parse(sessionStorage.getItem(key)).sources[0].label ===
            "Recovered access label",
        ),
    );
    page.once("dialog", (dialog) => dialog.accept());
    await page.reload();
    await button("Restore tab changes").click();
    assert.equal(
      await page
        .getByRole("textbox", {
          name: "Series label for Access count",
          exact: true,
        })
        .inputValue(),
      "Recovered access label",
      "Unsaved edits survive refresh after explicit recovery",
    );
    await page
      .getByRole("textbox", {
        name: "Series label for Access count",
        exact: true,
      })
      .fill("Access count");
    await dataPreviewAction().click();
    await button("Continue to visualization").click();
    await resultChart().waitFor();
    await saveIndicator("Composite updated", true);
    assert.match(saved[1].path, /saved-0\/update$/);

    await page.goto(
      new URL("/indicator/editor/multi-level-analysis", base).href,
    );
    await select("Access count");
    assert.equal(
      await button("Select Different method").isDisabled(),
      false,
      "Multilevel can use another method",
    );
    await select("Annotation count");
    await button("Continue to combine data").click();
    await dataPreviewAction().click();
    await page
      .getByRole("region", { name: "Preview results", exact: true })
      .getByText("6 rows · 3 columns", { exact: true })
      .waitFor();
    await button("Continue to analysis").click();
    await page
      .getByRole("combobox", { name: "Analytics method", exact: true })
      .click();
    await page
      .getByRole("option", { name: /^K-Means clusters(?:\s|$)/ })
      .click();
    await page
      .getByRole("alert")
      .filter({ hasText: "Method inputs temporarily unavailable" })
      .waitFor();
    await button("Retry").click();
    assert.equal(
      await page
        .getByRole("combobox", { name: "Analytics method", exact: true })
        .inputValue(),
      "K-Means clusters",
      "Retry preserves the selected method",
    );
    await checkPreviewAction();
    await dataPreviewAction().click();
    await page
      .getByRole("region", { name: "Preview results", exact: true })
      .getByRole("cell", { name: "Cluster 1", exact: true })
      .first()
      .waitFor();
    await button("Continue to visualization").click();
    await chooseLibrary();
    await generateChart("Scatter plot");
    await checkAutomaticUpdates("Scatter plot", "MULTI_LEVEL");
    await checkVisualizationDesign("Scatter plot");
    await saveIndicator("Multilevel fixture");
    assert.equal(saved[2].indicatorType, "MULTI_LEVEL");
    await page.goto(new URL("/indicator/editor/composite", base).href);
    await button("Select Access count").waitFor();
    assert.equal(await button("Select Access count").isDisabled(), false,
      "A fresh editor after saving has no recovered source selections");
    await select("Access count");
    await select("Student count");
    await page
      .getByRole("status")
      .filter({ hasText: "Saved in this tab" })
      .waitFor();
    await page.reload();
    await page
      .getByRole("region", { name: "Selected indicators", exact: true })
      .getByText("Student count", { exact: true })
      .waitFor();
    await button("Remove Student count").click();
    await button("Undo").click();
    await page.setViewportSize({ width: 390, height: 844 });
    await button("Continue to combine data").click();
    await dataPreviewAction().click();
    await page
      .getByRole("region", { name: "Preview results", exact: true })
      .waitFor();
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 2,
      ),
      "Mobile tables scroll within the editor, not the page",
    );
    await button("Start over").click();
    await page
      .getByRole("dialog", { name: "Start a new indicator?", exact: true })
      .getByRole("button", { name: "Start over", exact: true })
      .click();
    assert.equal(
      await page
        .getByRole("region", { name: "Selected indicators", exact: true })
        .count(),
      0,
      "Confirmed reset clears this tab's configuration",
    );
    await page.goto(new URL("/indicator", base).href);
    const openBlockedDeletion = async () => {
      await button("More actions for Access count").click();
      await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
      await page
        .getByRole("dialog", { name: "Are you sure?", exact: true })
        .getByRole("button", { name: "Confirm delete", exact: true })
        .click();
      await page
        .getByRole("dialog", { name: "Cannot delete indicator", exact: true })
        .waitFor();
    };
    await openBlockedDeletion();
    let blocked = page.getByRole("dialog", {
      name: "Cannot delete indicator",
      exact: true,
    });
    await blocked
      .getByText("Composite fixture <strong>literal</strong>", { exact: true })
      .waitFor();
    assert.equal(
      await blocked.locator("strong").count(),
      0,
      "Dependency names render as safe text",
    );
    await blocked.getByRole("button", { name: "Close", exact: true }).click();
    await blocked.waitFor({ state: "hidden" });
    await button("More actions for Access count").waitFor();
    assert.equal(
      await button("More actions for Access count").count(),
      1,
      "Blocked source remains available",
    );
    await openBlockedDeletion();
    blocked = page.getByRole("dialog", {
      name: "Cannot delete indicator",
      exact: true,
    });
    await blocked
      .getByRole("button", {
        name: "Preview dependent indicator Composite fixture <strong>literal</strong>",
        exact: true,
      })
      .click();
    await page.waitForURL("**/indicator/saved-0");
    await page.getByRole("region", { name: "Dataset", exact: true }).waitFor();
    assert.deepEqual(pageErrors, []);
    assert.deepEqual(failures, []);
    assert.ok(requests.includes("v1/indicators/saved-0/result"));
    console.log(
      "PASS: Composite same-method selection, recovery/retry,8-row union+filled zeros, grouped mappings/create/directedit/update/saved current table; Multilevel6-row intersection, two-feature analysis, scatter/save; new/edit tab recovery, failed-save preservation, delayed-navigation save cleanup, confirmed reset, metadata retry, undo, mobile containment; blocked source deletion retains source and safely links its dependents; automatic chart selection/mapping/customization previews, invalid-input gating, explicit error retry and stale-response suppression for both types; no browser errors.",
    );
  } finally {
    await context.close();
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
