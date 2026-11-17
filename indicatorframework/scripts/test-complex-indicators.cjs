// UI contract fixture: all identities, datasets, plugin metadata and chart
// markup are synthetic. Real plugin/database execution is qualified separately.
// Start Vite with VITE_BACKEND_URL=/api/, then use the existing WebKit tools:
// OPENLAP_TEST_BASE_URL=http://127.0.0.1:15281 npm run test:complex-indicators
// OPENLAP_COMPLEX_DRAFT_ONLY=1 runs just persistent draft lifecycle checks.
// OPENLAP_COMPLEX_TERMINAL_ONLY=1 checks an uncertain completion and exact retry.
const { webkit } = require("playwright");
const assert = require("node:assert/strict");
const workspacePage = require("./indicator-workspace-fixture.cjs");
const chartRendererFixture = require("./chart-renderer-fixture.cjs");
const editorNavigation = require("./editor-navigation-assertions.cjs");
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
  createdOn: "2026-01-02T12:00:00",
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
const expandedSources = [
  ...sources,
  ...Array.from({ length: 14 }, (_, index) => ({
    ...source(`extra-${index + 1}`, `Extra indicator ${String(index + 1).padStart(2, "0")}`),
    createdOn: `2026-02-${String(index + 1).padStart(2, "0")}T12:00:00`,
  })),
  {
    ...source("long-label", "Access count with a long descriptive indicator name " + "UnbrokenLabel".repeat(12), "long-method"),
    analyticsMethod: { id: "long-method", name: "A method with a long descriptive label " + "UnbrokenMethod".repeat(10) },
    createdOn: "2025-01-01T12:00:00",
  },
];
let expandedCatalog = false;
const sourceCatalogRequests = [], sourcePreviewRequests = [], sourcePreviewPlans = [], sourceDataRequests = [], sourceDataPlans = [];
const codeForSource = (item) => encodeURIComponent(
  `<svg width="100%" height="260" viewBox="0 0 500 260" role="img" aria-label="${item.name} source chart"><title>${item.name}</title><rect width="100" height="100" fill="blue" /></svg><script>/* Static workflow fixture. Runtime execution is qualified by test:chart-runtime. */</script>`,
);
const sourceDataset = (item) => ({ columns: {
  material: column(material, [`${item.name} material 1`, `${item.name} material 2`]),
  count: column(count, [42, 17]),
} });
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
  `${chartMarkup}<script>/* Static workflow fixture. */</script>`,
);
const failures = [],
  pageErrors = [],
  saved = [],
  requests = [],
  previews = [],
  previewPlans = [];
const mergeRequests = [], mergePlans = [], analysisRequests = [], analysisPlans = [];
const drafts = new Map(), draftReceipts = new Map(), draftWrites = [], draftWritePlans = [];
let nextDraftId = 1;
const draftResponse = (body, sourceIndicatorId = null) => ({
  id: `draft-${nextDraftId++}`, indicatorType: body.indicatorType,
  schemaVersion: 1, name: body.name || "", configuration: structuredClone(body.configuration),
  sourceIndicatorId, revision: 1, status: "DRAFT",
  createdAt: "2026-11-15T12:00:00Z", updatedAt: "2026-11-15T12:00:00Z",
});
const terminalDraftReceipt = (item, status, savedIndicatorId) => ({
  id: item.id, indicatorType: item.indicatorType, schemaVersion: item.schemaVersion,
  name: item.name, revision: item.revision + 1, status, configuration: null,
  createdAt: item.createdAt, updatedAt: new Date().toISOString(),
  ...(savedIndicatorId ? { savedIndicatorId } : {}),
});
const codeForPreview = (token) => encodeURIComponent(
  `${chartMarkup.replace('<svg ', '<svg data-preview-token="' + token + '" ')}<script>/* Static workflow fixture. */</script>`,
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
let failChartCatalog = false;
let chartCatalogFailures = 0;

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
  let page;
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
    const chartRendererRoute = chartRendererFixture(base);
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
      if (await chartRendererRoute(route)) return;
      if ((url.pathname === "/src/pages/indicators/dashboard/indicator-editor-dashboard.jsx"
          || /^\/assets\/indicator-editor-dashboard-[^/]+\.js$/.test(url.pathname))
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
      if (path === "v1/indicators/sources") {
        const query = Object.fromEntries(url.searchParams);
        sourceCatalogRequests.push(query);
        const pageNumber = Number(query.page || 0), size = Number(query.size || 10);
        const sortBy = query.sortBy || "name", descending = query.sortDirection === "desc";
        let filtered = (expandedCatalog ? expandedSources : sources).filter((item) =>
          item.name.toLowerCase().includes((query.searchText || "").toLowerCase())
          && (!query.methodId || item.analyticsMethod.id === query.methodId));
        filtered = [...filtered].sort((a, b) => {
          const compared = String(a[sortBy] || "").localeCompare(String(b[sortBy] || ""));
          return (descending ? -compared : compared) || a.id.localeCompare(b.id);
        });
        return send({
          content: filtered.slice(pageNumber * size, (pageNumber + 1) * size),
          totalPages: Math.ceil(filtered.length / size), totalElements: filtered.length,
          number: pageNumber, size, numberOfElements: Math.min(size, Math.max(0, filtered.length - pageNumber * size)),
          pageable: { pageNumber, pageSize: size },
        });
      }
      const sourcePreviewMatch = path.match(/^v1\/indicators\/sources\/([^/]+)\/preview$/);
      if (sourcePreviewMatch) {
        const item = expandedSources.find((item) => item.id === decodeURIComponent(sourcePreviewMatch[1]));
        assert.ok(item, "Only a catalog source can be previewed");
        const call = { id: item.id, completed: false };
        sourcePreviewRequests.push(call);
        const plan = sourcePreviewPlans.shift() || {};
        if (plan.delayMs) await new Promise((resolve) => setTimeout(resolve, plan.delayMs));
        try {
          if (plan.fail) return await route.fulfill({ status: 503, contentType: "application/json",
            body: JSON.stringify({ message: "Source chart temporarily unavailable." }) });
          return await send({ id: item.id, name: item.name, type: "BASIC", createdOn: item.createdOn,
            analyticsTechnique: item.analyticsMethod.name, analyticsTechniqueId: item.analyticsMethod.id,
            visualizationTypeId: "grouped", indicatorCode: codeForSource(item) });
        } finally { call.completed = true; }
      }
      if (path === "v1/indicators/analyze") {
        const item = expandedSources.find((item) => item.id === body.indicators[0].indicatorId);
        assert.ok(item);
        sourceDataRequests.push(item.id);
        const plan = sourceDataPlans.shift() || {};
        if (plan.fail) return route.fulfill({ status: 503, contentType: "application/json",
          body: JSON.stringify({ message: "Source data temporarily unavailable." }) });
        return send({ indicators: [{ indicatorId: item.id, analyzedDataset: sourceDataset(item) }] });
      }
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
      if (path === "v1/visualizations/libraries/library/types") {
        if (failChartCatalog) {
          failChartCatalog = false;
          chartCatalogFailures++;
          return route.fulfill({ status: 503, contentType: "application/json",
            body: JSON.stringify({ message: "Chart catalog temporarily unavailable." }) });
        }
        return send(charts);
      }
      if (/^v1\/indicators\/(composite|multilevel)\/merge$/.test(path)) {
        const multi = path.includes("/multilevel/");
        if (!multi) assert.deepEqual(body.indicators.map((item) => item.indicatorId), ["access", "students"]);
        const call = { path, body, completed: false };
        mergeRequests.push(call);
        const plan = mergePlans.shift() || {};
        if (plan.delayMs) await new Promise((resolve) => setTimeout(resolve, plan.delayMs));
        try {
          if ((!multi && failMerge) || plan.fail) {
            failMerge = false;
            return await route.fulfill({ status: 503, contentType: "application/json",
              body: JSON.stringify({ message: "Source data temporarily unavailable. Retry without changing your selection." }) });
          }
          const data = structuredClone(multi ? intersection : wide);
          if (plan.value) data.columns.source_access__count.data[0] = plan.value;
          return await send(multi ? { mergedData: data } : data);
        } finally { call.completed = true; }
      }
      if (path === "v1/indicators/multilevel/analyze") {
        const call = { path, body, completed: false };
        analysisRequests.push(call);
        const plan = analysisPlans.shift() || {};
        if (plan.delayMs) await new Promise((resolve) => setTimeout(resolve, plan.delayMs));
        assert.equal(body.analyticsTechniqueId, "kmeans");
        assert.deepEqual(
          Object.fromEntries(body.analyticsTechniqueMapping.mapping.map(
            (item) => [item.inputPort.id, item.outputPort.id],
          )),
          { attribute_1: "source_access__count", attribute_2: "source_annotations__count" },
        );
        try {
          if (plan.fail) return await route.fulfill({ status: 503, contentType: "application/json",
            body: JSON.stringify({ message: "Analysis service temporarily unavailable. Retry your analysis." }) });
          const data = structuredClone(analysis);
          if (plan.value) data.columns.attribute_1.data[0] = plan.value;
          return await send(data);
        } finally { call.completed = true; }
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
      const draftMatch = path.match(/^v1\/indicators\/drafts\/([^/]+)(?:\/(complete|resume))?$/);
      if (path === "v1/indicators/drafts" && request.method() === "POST") {
        const existing = [...drafts.values()].find((item) => item.clientRequestId === body.clientRequestId);
        if (existing) return send(existing);
        const draft = { ...draftResponse(body), clientRequestId: body.clientRequestId };
        drafts.set(draft.id, draft);
        draftWrites.push({ path, body: structuredClone(body), id: draft.id });
        return send(draft);
      }
      if (path === "v1/indicators/drafts" && request.method() === "GET") {
        const content = [...drafts.values()].filter((item) => item.status === "DRAFT");
        return send({ content, totalElements: content.length, totalPages: 1,
          pageable: { pageSize: 10, pageNumber: 0 } });
      }
      if (path === "v1/indicators/saved-0/edit-draft") {
        const existing = [...drafts.values()].find((item) => item.sourceIndicatorId === "saved-0" && item.status === "DRAFT");
        if (existing) return send(existing);
        const draft = draftResponse({ indicatorType: "COMPOSITE", name: saved[0].name,
          configuration: JSON.parse(saved[0].configuration) }, "saved-0");
        drafts.set(draft.id, draft);
        return send(draft);
      }
      if (draftMatch) {
        const draftId = decodeURIComponent(draftMatch[1]);
        const item = drafts.get(draftId) || draftReceipts.get(draftId);
        assert.ok(item, `Only an existing private draft can be accessed: ${request.method()} ${path}; available ${[...drafts.keys()].join(", ")}`);
        if (request.method() === "GET" || draftMatch[2] === "resume") return send(item);
        if ((request.method() === "DELETE" && item.status === "DISCARDED") ||
            (draftMatch[2] === "complete" && item.status === "COMPLETED")) return send(item);
        const revision = request.method() === "DELETE" ? Number(url.searchParams.get("revision")) : body.revision;
        assert.equal(revision, item.revision, "Every draft mutation uses the current acknowledged revision");
        if (request.method() === "DELETE") {
          const receipt = terminalDraftReceipt(item, "DISCARDED");
          draftReceipts.set(item.id, receipt);
          drafts.delete(item.id);
          return send(receipt);
        }
        if (draftMatch[2] === "complete") {
          assert.equal(item.status, "DRAFT", "A completed draft cannot be completed again");
          if (item.sourceIndicatorId && failUpdate) {
            failUpdate = false;
            return route.fulfill({ status: 503, contentType: "application/json",
              body: JSON.stringify({ message: "Update temporarily unavailable. Retry your save." }) });
          }
          const indicator = body.indicator;
          assert.equal(JSON.parse(indicator.configuration).type, indicator.indicatorType);
          assert.equal(JSON.parse(indicator.configuration).schemaVersion, 1);
          assert.deepEqual(JSON.parse(indicator.configuration), item.configuration,
            "Completion executes precisely the configuration acknowledged by the draft save");
          assert.equal(indicator.indicators.length, 2);
          const indicatorId = item.sourceIndicatorId || `saved-${saved.length}`;
          saved.push({ path, sourceIndicatorId: item.sourceIndicatorId, indicatorId, ...indicator });
          const receipt = terminalDraftReceipt(item, "COMPLETED", indicatorId);
          draftReceipts.set(item.id, receipt);
          drafts.delete(item.id);
          return send(receipt);
        }
        assert.equal(item.status, "DRAFT", "Autosave must stop after completion");
        const plan = draftWritePlans.shift() || {};
        if (plan.delayMs) await new Promise((resolve) => setTimeout(resolve, plan.delayMs));
        if (plan.fail) return route.fulfill({ status: 503, contentType: "application/json",
          body: JSON.stringify({ message: "Draft storage temporarily unavailable." }) });
        Object.assign(item, { name: body.name, configuration: structuredClone(body.configuration), revision: item.revision + 1,
          updatedAt: new Date().toISOString() });
        draftWrites.push({ path, body: structuredClone(body), id: item.id });
        return send(item);
      }
      if (path === "v1/indicators/my/workspace") return send(workspacePage({
        saved: [
          ...saved.map((item, index) => ({ id: "saved-" + index, name: item.name, type: item.indicatorType })),
          { id: "access", name: "Access count", type: "BASIC" },
        ], drafts: [...drafts.values()], query: url.searchParams,
      }));
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
          visualizationTypeId: saved[0].visualizationTypeId,
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
    page = await context.newPage();
    page.on("pageerror", (error) => pageErrors.push(error.stack || error.message));
    const checkbox = (name) => page.getByRole("checkbox", { name, exact: true });
    const select = async (name) => checkbox("Select " + name).check();
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
    const checkCombineLayout = async (secondName) => {
      const first = page.getByRole("region", { name: "Access count", exact: true });
      const second = page.getByRole("region", { name: secondName, exact: true });
      let [a, b] = await Promise.all([first.boundingBox(), second.boundingBox()]);
      assert.ok(Math.abs(a.y - b.y) < 2 && b.x > a.x + a.width,
        "Combine source panels use two comfortable desktop columns");
      await page.setViewportSize({ width: 390, height: 844 });
      [a, b] = await Promise.all([first.boundingBox(), second.boundingBox()]);
      assert.ok(Math.abs(a.x - b.x) < 2 && b.y >= a.y + a.height,
        "Combine source panels stack into one column on narrow screens");
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2),
        "Combine cards and their fields stay inside the mobile viewport");
      await page.setViewportSize({ width: 1280, height: 1000 });
    };
    const checkAutomaticCombine = async (type) => {
      const results = previewResults();
      const next = button(type === "COMPOSITE" ? "Continue to visualization" : "Continue to analysis");
      const measures = page.getByRole("combobox", { name: "Measures from Access count", exact: true });
      const label = page.getByRole("textbox", { name: "Series label for Access count", exact: true });
      let before = mergeRequests.length;
      await measures.click();
      await page.getByRole("option", { name: "Count", exact: true }).click();
      await page.keyboard.press("Escape");
      await page.waitForTimeout(900);
      assert.equal(mergeRequests.length, before, "Incomplete source measures never trigger an automatic merge");
      assert.equal(await next.isDisabled(), true, "Incomplete source choices invalidate the previous data preview");
      assert.equal(await results.getByRole("table").count(), 0, "Incomplete data choices remove the previous result table");
      await measures.click();
      await page.getByRole("option", { name: "Count", exact: true }).click();
      await page.keyboard.press("Escape");
      await until(() => mergeRequests.length === before + 1, "Restoring a source measure automatically refreshes the merge");
      await results.getByText(`${type === "COMPOSITE" ? 8 : 6} rows · 3 columns`, { exact: true }).waitFor();
      before = mergeRequests.length;
      mergePlans.push({ delayMs: 1500, value: 7777 });
      await label.fill(`${type} obsolete source`);
      await until(() => mergeRequests.length === before + 1, "Source labels refresh the combined preview automatically");
      const obsolete = mergeRequests.at(-1);
      mergePlans.push({ value: 8888 });
      await label.fill(`${type} latest source`);
      await until(() => mergeRequests.length === before + 2, "A newer source choice starts a replacement merge");
      await results.getByRole("cell", { name: "8888", exact: true }).waitFor();
      await until(() => obsolete.completed, "Obsolete delayed data response completes");
      assert.equal(await results.getByRole("cell", { name: "7777", exact: true }).count(), 0,
        "An obsolete data response cannot replace the current combined preview");
      assert.equal(await next.isDisabled(), false, "Only the latest successful merge enables the next step");
      await page.waitForTimeout(700);
      assert.equal(mergeRequests.length, before + 2, "Automatic merge completion does not cause a request loop");
      await label.fill("Access count");
      await until(() => mergeRequests.length === before + 3, "Resetting the label refreshes without a manual preview action");
      await results.getByRole("cell", { name: "860", exact: true }).waitFor();
    };
    const checkAutomaticAnalysis = async () => {
      const results = previewResults();
      const param = page.getByRole("spinbutton", { name: /^Number of clusters/ });
      let before = analysisRequests.length;
      const firstInput = page.getByRole("region", { name: "Method inputs", exact: true })
        .getByRole("combobox", { name: /^First feature/ });
      await firstInput.click();
      await page.getByRole("option", { name: "Select a column", exact: true }).click();
      await page.waitForTimeout(900);
      assert.equal(analysisRequests.length, before, "An incomplete method input never requests automatic analysis");
      assert.equal(await button("Continue to visualization").isDisabled(), true,
        "An incomplete method input invalidates the old analysis");
      await firstInput.click();
      await page.getByRole("option", { name: "Access count · Count", exact: true }).click();
      await until(() => analysisRequests.length === before + 1, "Restoring a method input automatically refreshes analysis");
      await results.getByRole("cell", { name: "Cluster 1", exact: true }).first().waitFor();
      before = analysisRequests.length;
      await param.fill("");
      await page.waitForTimeout(900);
      assert.equal(analysisRequests.length, before, "An empty required parameter never requests an automatic analysis");
      assert.equal(await button("Continue to visualization").isDisabled(), true,
        "Changing a required parameter invalidates the old analysis");
      await param.fill("2.5");
      await page.waitForTimeout(700);
      assert.equal(analysisRequests.length, before, "A fractional value for an integer method parameter never requests analysis");
      analysisPlans.push({ fail: true });
      await param.fill("3");
      await until(() => analysisRequests.length === before + 1, "A valid parameter automatically requests the analysis");
      await results.getByRole("alert").filter({ hasText: "Analysis service temporarily unavailable" }).waitFor();
      await page.waitForTimeout(900);
      assert.equal(analysisRequests.length, before + 1, "Failed analysis does not retry in a loop");
      await dataPreviewAction().click();
      await until(() => analysisRequests.length === before + 2, "Explicit retry recovers the analysis without changing inputs");
      await results.getByRole("cell", { name: "Cluster 1", exact: true }).first().waitFor();
      before = analysisRequests.length;
      analysisPlans.push({ delayMs: 1500, value: 7777 });
      await param.fill("4");
      await until(() => analysisRequests.length === before + 1, "Analysis parameters refresh the preview automatically");
      const obsolete = analysisRequests.at(-1);
      analysisPlans.push({ value: 8888 });
      await param.fill("3");
      await until(() => analysisRequests.length === before + 2, "Newer parameters replace an in-flight analysis");
      await results.getByRole("cell", { name: "8888", exact: true }).waitFor();
      await until(() => obsolete.completed, "Obsolete analysis response completes");
      assert.equal(await results.getByRole("cell", { name: "7777", exact: true }).count(), 0,
        "An obsolete analysis cannot overwrite the latest result");
      await dataPreviewAction().click();
      await results.getByRole("cell", { name: "860", exact: true }).waitFor();
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
    const checkEditorNavigation = async (type) => {
      await editorNavigation.chooseStep(page, "Select indicators", "sources");
      assert.equal(await checkbox("Deselect Access count").isChecked(), true, "Returning to sources preserves selected indicators");
      await editorNavigation.chooseStep(page, "Combine data", "combine");
      if (type === "MULTI_LEVEL") await editorNavigation.chooseStep(page, "Analysis", "analysis");
      await editorNavigation.chooseStep(page, "Visualization", "visualization");
      await page.getByText("Draft saved", { exact: true }).waitFor();
      await page.waitForTimeout(1100);
      const before = { writes: draftWrites.length, merge: mergeRequests.length, analysis: analysisRequests.length, charts: previews.length };
      await editorNavigation.scrollToStep(page, "combine");
      await editorNavigation.assertCurrent(page, "Combine data");
      await page.waitForTimeout(1100);
      assert.deepEqual({ writes: draftWrites.length, merge: mergeRequests.length, analysis: analysisRequests.length, charts: previews.length }, before,
        `${type} scroll-only orientation neither saves nor executes data or chart previews`);
      await editorNavigation.chooseStep(page, "Visualization", "visualization");
      await editorNavigation.assertNoOverflow(page);
    };
    const chartFrame = () => page.getByRole("region", { name: "Live preview", exact: true }).frameLocator('iframe[title="OpenLAP chart preview"]');
    const resultChart = () => chartFrame().getByRole("img", { name: "Synthetic result chart", exact: true });
    const sourceChart = (drawer, name) => drawer.frameLocator('iframe[title="OpenLAP chart preview"]').getByRole("img", { name, exact: true });
    const waitForPreview = async (call) => {
      await until(() => call.completed, "Preview response completes");
      await resultChart().waitFor();
      await chartFrame().locator('[data-preview-token="' + call.token + '"]').waitFor();
      await page.getByRole("region", { name: "Live preview", exact: true }).locator('iframe[aria-busy="false"]').waitFor();
      await page.waitForFunction(() => {
        const action = document.querySelector('button[aria-label="Save indicator"],button[aria-label="Review changes"]');
        return action && !action.disabled;
      });
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
      assert.equal(await page.getByRole("region", { name: "Live preview", exact: true }).locator("iframe").count(), 0, "Incomplete mappings remove the previous chart frame");

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
    const checkCatalogRecovery = async () => {
      const sourceStep = page.getByRole("region", { name: "Select indicators step", exact: true });
      await sourceStep.getByRole("button", { name: "Open", exact: true }).click();
      const before = previews.length;
      failChartCatalog = true;
      await sourceStep.getByRole("button", { name: "Refresh sources", exact: true }).click();
      await until(() => chartCatalogFailures === 1, "Catalog refresh exercises a failed chart-type request");
      await until(() => previews.length > before, "Known valid chart automatically refreshes after the catalog attempt");
      await page.waitForFunction((before) => {
        const frame = document.querySelector('[aria-label="Live preview"] iframe');
        const token = frame?.contentDocument?.querySelector('[data-preview-token]')?.getAttribute('data-preview-token') || '';
        const action = document.querySelector('button[aria-label="Save indicator"]');
        return Number(token.replace('preview-', '')) > before && action && !action.disabled;
      }, before);
      const live = page.getByRole("region", { name: "Live preview", exact: true });
      assert.equal(await live.getByRole("alert").filter({ hasText: "Chart catalog temporarily unavailable" }).count(), 0,
        "A metadata refresh error never replaces a valid chart with a false preview failure");
      assert.equal(await button("Retry preview").count(), 0, "Successful preview is not presented as a failed request");
      assert.equal(await button("Save indicator").isDisabled(), false);
      await sourceStep.getByRole("button", { name: "Close", exact: true }).click();
    };
    const saveIndicator = async (name, update = false) => {
      await waitForPreview(previews.at(-1));
      // An iframe can paint before the surrounding Collapse finishes opening.
      // Wait for its final geometry so pointerup still lands on the save button.
      await page.waitForFunction(() => {
        const action = document.querySelector('button[aria-label="Save indicator"],button[aria-label="Review changes"]');
        if (!action || action.disabled) return false;
        for (let parent = action.parentElement; parent; parent = parent.parentElement) {
          if (parent.classList.contains("MuiCollapse-root")
            && !parent.classList.contains("MuiCollapse-entered")) return false;
        }
        return true;
      });
      const previewsBeforeSave = previews.length;
      const mergesBeforeSave = mergeRequests.length, analysesBeforeSave = analysisRequests.length;
      await button(update ? "Review changes" : "Save indicator").click();
      const dialog = page.getByRole("dialog", {
        name: /(?:Save|Update) (?:composite|multilevel analysis) indicator/,
      });
      await dialog.getByRole("textbox", { name: "Indicator name" }).fill(name);
      const saveAction = dialog.getByRole("button", {
        name: update ? "Update indicator" : "Save indicator", exact: true,
      });
      await saveAction.click();
      if (update) {
        await page.getByRole("alert").filter({ hasText: "Update temporarily unavailable" }).waitFor();
        await until(() => [...drafts.values()].some((draft) => draft.sourceIndicatorId === "saved-0"
          && draft.status === "DRAFT" && draft.name === name), "A failed completion retains the latest server draft");
        await button("Resume previous save").click();
      }
      await page.waitForURL("**/indicator");
      await page
        .getByRole("heading", { name: "My Indicators", exact: true })
        .waitFor();
      assert.equal(previews.length, previewsBeforeSave,
        "Editing only the indicator name and saving do not regenerate the chart");
      assert.equal(mergeRequests.length, mergesBeforeSave, "Indicator name edits do not recompute combined data");
      assert.equal(analysisRequests.length, analysesBeforeSave, "Indicator name edits do not rerun the analysis");
    };

    expandedCatalog = true;
    await page.goto(new URL("/indicator/editor/composite", base).href);
    const interLoaded = await page.evaluate(async () => {
      await document.fonts.ready;
      const faces = await document.fonts.load("14px Inter");
      return faces.length > 0 && faces.every((face) => face.status === "loaded");
    });
    assert.ok(interLoaded, "Visual consistency is checked with the app's actual Inter font");
    const sourceTable = () => page.getByRole("table", { name: "Available Basic indicators", exact: true });
    const selectionCount = async (count) => page.getByRole("status").filter({
      hasText: new RegExp(`^${count} of 10 selected\\.`),
    }).waitFor();
    const sourceSearch = () => page.getByRole("searchbox", { name: "Search your Basic indicators", exact: true });
    const checkSourceGeometry = async (label) => {
      const table = sourceTable();
      await table.waitFor();
      await table.scrollIntoViewIfNeeded();
      const geometry = await table.evaluate((element) => {
        const container = element.parentElement;
        const stepper = document.querySelector("main .MuiStepper-root");
        const style = getComputedStyle(container);
        const oldTop = container.scrollTop;
        container.scrollTop = container.scrollHeight;
        const verticalMovement = container.scrollTop;
        container.scrollTop = oldTop;
        container.scrollLeft = 200;
        const horizontalMovement = container.scrollLeft;
        container.scrollLeft = 0;
        const overflowingScrollers = [...document.querySelectorAll("main, main *")].filter((node) => {
          const box = node.getBoundingClientRect();
          const css = getComputedStyle(node);
          return box.width > 1 && box.height > 1 && css.visibility !== "hidden"
            && ["auto", "scroll"].includes(css.overflowX)
            && node.scrollWidth > node.clientWidth + 1;
        }).map((node) => ({ tag: node.tagName, label: node.getAttribute("aria-label"),
          className: String(node.className), client: node.clientWidth, scroll: node.scrollWidth }));
        const rows = [...element.querySelectorAll("tbody tr")].flatMap((row) => {
          const checkbox = row.querySelector(".MuiCheckbox-root");
          const preview = row.querySelector("button[data-source-preview-id]");
          if (!checkbox || !preview) return [];
          const a = checkbox.getBoundingClientRect(), b = preview.getBoundingClientRect();
          const cell = checkbox.closest("td").getBoundingClientRect(), r = row.getBoundingClientRect();
          return [{ checkboxWidth: a.width, checkboxHeight: a.height,
            horizontalError: Math.abs(a.x + a.width / 2 - cell.x - cell.width / 2),
            verticalError: Math.abs(a.y + a.height / 2 - r.y - r.height / 2),
            previewError: Math.abs(a.y + a.height / 2 - b.y - b.height / 2) }];
        });
        return { viewport: innerWidth, documentWidth: document.documentElement.scrollWidth,
          table: { client: element.clientWidth, scroll: element.scrollWidth },
          container: { client: container.clientWidth, scroll: container.scrollWidth,
            overflowX: style.overflowX, overscrollX: style.overscrollBehaviorX,
            verticalRange: container.scrollHeight - container.clientHeight, verticalMovement, horizontalMovement },
          stepper: stepper ? { client: stepper.clientWidth, scroll: stepper.scrollWidth } : null,
          overflowingScrollers, rows };
      });
      assert.ok(geometry.documentWidth <= geometry.viewport + 1, label + ": editor stays within viewport");
      assert.deepEqual(geometry.overflowingScrollers, [], label + ": no nested horizontal scroll range");
      assert.ok(geometry.table.scroll <= geometry.table.client + 1, label + ": source table content fits without clipping");
      assert.ok(geometry.container.scroll <= geometry.container.client + 1, label + ": source container has no horizontal range");
      assert.equal(geometry.container.horizontalMovement, 0, label + ": source table cannot move sideways");
      assert.equal(geometry.container.overflowX, "hidden", label + ": horizontal scrolling is explicitly disabled");
      assert.equal(geometry.container.overscrollX, "none", label + ": sideways elastic scrolling is disabled");
      assert.ok(geometry.stepper.scroll <= geometry.stepper.client + 1, label + ": step controls fit their section");
      if (geometry.container.verticalRange > 1) {
        assert.ok(geometry.container.verticalMovement > 0, label + ": vertical source scrolling remains available");
      }
      for (const row of geometry.rows) {
        assert.ok(row.checkboxWidth >= 40 && row.checkboxHeight >= 40, label + ": checkbox keeps its touch target");
        assert.ok(row.horizontalError <= 1.5 && row.verticalError <= 1.5 && row.previewError <= 1.5,
          label + ": checkbox and preview are centered in each row: " + JSON.stringify(row));
      }
      const box = await table.boundingBox();
      await page.mouse.move(box.x + box.width / 2, Math.min(box.y + 40, (await page.viewportSize()).height - 40));
      await page.mouse.wheel(180, 0);
      await page.waitForTimeout(100);
      assert.equal(await table.evaluate((element) => element.parentElement.scrollLeft), 0,
        label + ": a horizontal gesture does not pan the source list");
    };
    const checkSourcePicker = async () => {
      await checkbox("Select Access count").waitFor();
      await checkSourceGeometry("Desktop source picker");
      assert.equal(sourcePreviewRequests.length, 0, "Catalog browsing does not generate source charts");
      assert.equal(sourceDataRequests.length, 0, "Catalog browsing does not analyze source data");
      await sourceTable().getByRole("button", { name: "Sort by indicator name", exact: true }).click();
      await until(() => sourceCatalogRequests.at(-1)?.sortDirection === "desc", "Name sort applies across the server catalog");
      await checkbox("Select Unavailable plugin").waitFor();
      await sourceTable().getByRole("button", { name: "Sort by date", exact: true }).click();
      await until(() => sourceCatalogRequests.at(-1)?.sortBy === "createdOn", "Date header requests server ordering");
      await sourceTable().getByRole("button", { name: "Sort by date", exact: true }).click();
      await checkbox("Select Extra indicator 14").waitFor();
      await select("Extra indicator 14");
      await selectionCount(1);
      assert.equal(await checkbox("Deselect Extra indicator 14").isChecked(), true,
        "Selected rows expose a checked checkbox instead of a disabled Select button");

      await sourceSearch().fill("Access count");
      await button("Preview Access count").click();
      let drawer = page.getByRole("dialog", { name: "Preview indicator", exact: true });
      await sourceChart(drawer, "Access count source chart").waitFor();
      assert.equal(await page.getByRole("checkbox", { name: "Select Access count", exact: true, includeHidden: true }).isChecked(), false,
        "Inspecting an eligible source does not select it");
      await drawer.getByRole("button", { name: "Select indicator", exact: true }).click();
      await drawer.getByRole("button", { name: "Remove from selection", exact: true }).waitFor();
      await drawer.getByRole("button", { name: "Back to indicators", exact: true }).click();
      await drawer.waitFor({ state: "hidden" });
      await checkbox("Deselect Access count").waitFor();
      await selectionCount(2);
      const selected = page.getByRole("region", { name: "Selected indicators", exact: true });
      await selected.getByText("Extra indicator 14", { exact: true }).waitFor();
      assert.equal(await sourceTable().getByText("Extra indicator 14", { exact: true }).count(), 0,
        "Selected items remain visible outside the filtered catalog page");
      await selected.getByRole("button", { name: "Remove Extra indicator 14", exact: true }).click();
      await selectionCount(1);
      await button("Undo").click();
      await selectionCount(2);
      await checkbox("Deselect Access count").waitFor();
      assert.equal(await checkbox("Deselect Access count").isChecked(), true);

      await sourceSearch().fill("");
      const sameMethod = page.getByRole("checkbox", { name: "Same analytics method only", exact: true });
      await sameMethod.check();
      await until(() => sourceCatalogRequests.at(-1)?.methodId === "counts", "Matching-method filtering is global and server-side");
      assert.equal(sourceCatalogRequests.at(-1).page, "0", "Changing filters resets pagination");
      await sameMethod.uncheck();
      await until(() => !sourceCatalogRequests.at(-1)?.methodId, "Disabling the method filter restores the full catalog");
      await sourceSearch().fill("Different method");
      await checkbox("Select Different method").waitFor();
      assert.equal(await checkbox("Select Different method").isDisabled(), true);
      assert.ok(await checkbox("Select Different method").getAttribute("aria-describedby"),
        "Unavailable choices point to a visible explanation, not color alone");
      const incompatiblePreview = button("Preview Different method");
      assert.equal(await incompatiblePreview.isEnabled(), true, "Incompatible sources remain inspectable");
      await incompatiblePreview.click();
      drawer = page.getByRole("dialog", { name: "Preview indicator", exact: true });
      await sourceChart(drawer, "Different method source chart").waitFor();
      assert.equal(await drawer.getByRole("button", { name: "Select indicator", exact: true }).isDisabled(), true);
      await page.keyboard.press("Escape");
      await drawer.waitFor({ state: "hidden" });
      await page.waitForFunction(() => document.activeElement?.getAttribute("aria-label") === "Preview Different method");
      await selectionCount(2);
      assert.equal(await sourceSearch().inputValue(), "Different method", "Preview close preserves the catalog search");

      await sourceSearch().fill("Nothing matches this search");
      await sourceTable().getByText("No indicators match these filters. Clear the filters or try another name.", { exact: true }).waitFor();
      await selectionCount(2);
      await button("Clear filters").click();
      await checkbox("Deselect Extra indicator 14").waitFor();
      assert.equal(sourceCatalogRequests.at(-1).searchText, "");
      await button("Go to next page").click();
      await until(() => sourceCatalogRequests.at(-1)?.page === "1", "Pagination requests the next server page");
      await checkbox("Deselect Access count").waitFor();
      assert.equal(await checkbox("Deselect Access count").isChecked(), true,
        "Selection stays checked when returning to its later catalog page");
      await checkbox("Deselect Access count").uncheck();
      await selectionCount(1);
      await page.getByRole("combobox", { name: /^Rows per page/ }).click();
      await page.getByRole("option", { name: "25", exact: true }).click();
      await until(() => sourceCatalogRequests.at(-1)?.size === "25" && sourceCatalogRequests.at(-1)?.page === "0", "Page size changes reset paging without clearing selections");
      for (let number = 1; number <= 9; number++) await select(`Extra indicator ${String(number).padStart(2, "0")}`);
      await selectionCount(10);
      assert.equal(await checkbox("Select Student count").isDisabled(), true, "The limit blocks only additional choices");
      assert.equal(await checkbox("Deselect Extra indicator 14").isEnabled(), true, "Selected choices can still be deselected at the limit");
      await button("Show all selected (10)").click();
      await selected.getByRole("button", { name: "Remove Extra indicator 01", exact: true }).click();
      await selectionCount(9);
      await select("Extra indicator 01");
      await selectionCount(10);

      await sourceSearch().fill("Student count");
      await button("Preview Student count").click();
      drawer = page.getByRole("dialog", { name: "Preview indicator", exact: true });
      await sourceChart(drawer, "Student count source chart").waitFor();
      assert.equal(sourceDataRequests.length, 0, "Opening a chart does not eagerly calculate source data");
      sourceDataPlans.push({ fail: true });
      await drawer.getByRole("tab", { name: "Data", exact: true }).click();
      await drawer.getByRole("alert").filter({ hasText: "Source data temporarily unavailable" }).waitFor();
      await drawer.getByRole("button", { name: "Retry source data", exact: true }).click();
      await drawer.getByRole("cell", { name: "Student count material 1", exact: true }).waitFor();
      assert.deepEqual(sourceDataRequests, ["students", "students"], "Source data is calculated only on request or explicit retry");
      await drawer.getByRole("tab", { name: "Details", exact: true }).click();
      await drawer.getByRole("tab", { name: "Data", exact: true }).click();
      assert.equal(sourceDataRequests.length, 2, "Revisiting already loaded data does not repeat execution");
      await drawer.getByRole("button", { name: "Back to indicators", exact: true }).click();
      await drawer.waitFor({ state: "hidden" });
      assert.equal(await sourceSearch().inputValue(), "Student count");
      await selectionCount(10);

      sourcePreviewPlans.push({ fail: true });
      await button("Preview Student count").click();
      drawer = page.getByRole("dialog", { name: "Preview indicator", exact: true });
      await drawer.getByRole("alert").filter({ hasText: "Source chart temporarily unavailable" }).waitFor();
      await drawer.getByRole("button", { name: "Retry chart preview", exact: true }).click();
      await sourceChart(drawer, "Student count source chart").waitFor();
      await drawer.getByRole("button", { name: "Close indicator preview", exact: true }).click();
      await drawer.waitFor({ state: "hidden" });

      sourcePreviewPlans.push({ delayMs: 1000 });
      const beforeDelayedPreview = sourcePreviewRequests.length;
      await button("Preview Student count").click();
      drawer = page.getByRole("dialog", { name: "Preview indicator", exact: true });
      await drawer.getByRole("progressbar", { name: "Loading indicator preview", exact: true }).waitFor();
      await until(() => sourcePreviewRequests.length > beforeDelayedPreview, "Delayed source preview starts");
      const obsoleteSource = sourcePreviewRequests.at(-1);
      await drawer.getByRole("button", { name: "Close indicator preview", exact: true }).click();
      await drawer.waitFor({ state: "hidden" });
      await sourceSearch().fill("Access count");
      await button("Preview Access count").click();
      drawer = page.getByRole("dialog", { name: "Preview indicator", exact: true });
      await sourceChart(drawer, "Access count source chart").waitFor();
      await until(() => obsoleteSource.completed, "The obsolete source preview response completes");
      assert.equal(await sourceChart(drawer, "Student count source chart").count(), 0,
        "A closed source's delayed preview cannot replace a newer source");
      await drawer.getByRole("button", { name: "Back to indicators", exact: true }).click();
      await drawer.waitFor({ state: "hidden" });
      await page.setViewportSize({ width: 390, height: 844 });
      await checkbox("Select Access count").waitFor();
      await button("Preview Access count").waitFor();
      await checkSourceGeometry("Mobile picker with long labels and expanded selections");
      const mobileLayout = await page.evaluate(() => ({
        width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
        offenders: [...document.querySelectorAll('main *')].map((element) => ({element, rect:element.getBoundingClientRect()}))
          .filter(({rect}) => rect.width > 0 && rect.right > innerWidth + 2)
          .slice(0, 12).map(({element,rect}) => ({tag:element.tagName, class:element.className,
            text:element.textContent.slice(0,70), right:rect.right, width:rect.width})),
      }));
      if (mobileLayout.scrollWidth > mobileLayout.width + 2) {
        await page.screenshot({ path: '/private/tmp/openlap-source-picker-mobile-overflow.png', fullPage: true });
      }
      assert.ok(mobileLayout.scrollWidth <= mobileLayout.width + 2,
        "The compact source table remains inside the mobile page: " + JSON.stringify(mobileLayout));
      await page.setViewportSize({ width: 1280, height: 1000 });
      await button("Start over").click();
      await page.getByRole("dialog", { name: "Start a new indicator?", exact: true })
        .getByRole("button", { name: "Start over", exact: true }).click();
      expandedCatalog = false;
      await sourceSearch().fill("");
      await button("Refresh sources").click();
      await checkbox("Select Access count").waitFor();
      await checkbox("Select Student count").waitFor();
      await selectionCount(0);
      assert.equal(await checkbox("Select Access count").isEnabled(), true);
    };
    if (process.env.OPENLAP_COMPLEX_DRAFT_ONLY === "1" || process.env.OPENLAP_COMPLEX_TERMINAL_ONLY === "1") {
      expandedCatalog = false;
      failMerge = failMethodContract = false;
      failUpdate = process.env.OPENLAP_COMPLEX_TERMINAL_ONLY === "1";
      const configuration = {
        schemaVersion: 1, type: "COMPOSITE", name: "Saved Composite fixture",
        sources: [sources[0], sources[1]].map((item) => ({
          id: item.id, name: item.name, analyticsMethod: item.analyticsMethod, outputs: item.outputs,
          keyColumnId: "material", measureColumnIds: ["count"], label: item.name,
        })),
        analysis: { methodId: "", mapping: { mapping: [] }, params: [] },
        visualization: { libraryId: "library", typeId: "grouped", mapping: { mapping: [
          { inputPort: charts[0].chartInputs[0], outputPort: wide.chartData.columns.combined_key.configurationData },
          { inputPort: charts[0].chartInputs[1], outputPort: wide.chartData.columns.combined_series.configurationData },
          { inputPort: charts[0].chartInputs[2], outputPort: wide.chartData.columns.combined_value.configurationData },
        ] }, params: {}, dataMode: "combined" },
      };
      saved.push({ indicatorType: "COMPOSITE", name: configuration.name,
        configuration: JSON.stringify(configuration), visualizationTypeId: "grouped" });
      if (process.env.OPENLAP_COMPLEX_TERMINAL_ONLY === "1") {
        await page.goto(new URL("/indicator/editor/composite/edit/saved-0", base).href);
        await previewResults().getByText("8 rows · 3 columns", { exact: true }).waitFor();
        await button("Continue to visualization").click();
        await resultChart().waitFor();
        await button("Review changes").waitFor({ state: "visible" });
        await saveIndicator("Reconciled saved edit", true);
        assert.equal(saved.at(-1).sourceIndicatorId, "saved-0");
        assert.deepEqual(pageErrors, []);
        assert.deepEqual(failures, []);
        console.log("PASS: Complex uncertain completion locks authoring, exposes Resume previous save, reconciles the server draft and retries the original definition without extra preview execution");
        return;
      }
    } else {
    await checkSourcePicker();
    const sourceSection = page.getByRole("region", {name:"Select indicators step", exact:true});
    await sourceSection.getByRole("button", {name:"Close", exact:true}).click();
    await checkbox("Select Access count").waitFor({state:"detached"});
    await sourceSection.getByRole("button", {name:"Open", exact:true}).click();
    await select("Access count");
    assert.equal(
      await checkbox("Select Different method").isDisabled(),
      true,
      "Composite excludes a different method",
    );
    assert.equal(
      await checkbox("Select Unavailable plugin").isDisabled(),
      true,
      "Unavailable source stays readable but unselectable",
    );
    await select("Student count");
    assert.equal(mergeRequests.length, 0, "Source selection and browsing do not execute a merge before confirmation");
    await button("Continue to combine data").click();
    assert.equal(previews.length, 0, "No chart preview runs before combined result data is available");
    await page
      .getByRole("alert")
      .filter({ hasText: "Source data temporarily unavailable" })
      .waitFor();
    assert.equal(mergeRequests.length, 1, "Preselected valid source columns automatically request their first merge");
    await checkPreviewAction();
    await page.waitForTimeout(900);
    assert.equal(mergeRequests.length, 1, "A failed automatic merge does not retry itself");
    await dataPreviewAction().click();
    const combined = page.getByRole("region", {
      name: "Preview results",
      exact: true,
    });
    await combined.getByText("8 rows · 3 columns", { exact: true }).waitFor();
    await combined.getByText(/4 cells were filled with zero/).waitFor();
    await checkCombineLayout("Student count");
    await checkAutomaticCombine("COMPOSITE");
    await button("Continue to visualization").click();
    await chooseLibrary();
    await generateChart("Grouped bar");
    await checkEditorNavigation("COMPOSITE");
    await checkCatalogRecovery();
    await checkAutomaticUpdates("Grouped bar", "COMPOSITE");
    await checkVisualizationDesign("Grouped bar");
    await saveIndicator("Composite fixture");
    assert.ok(delayedDashboardModule, "The first save waits for a cold lazy destination");
    assert.equal([...drafts.values()].filter((draft) => draft.indicatorType === "COMPOSITE" && draft.status === "DRAFT").length, 0,
      "Successful completion leaves no active draft during delayed navigation");
    assert.ok(draftWrites.length > 0, "The workflow persists incomplete progress through the draft API");
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
    const beforeEditMerges = mergeRequests.length;
    await page.goto(
      new URL("/indicator/editor/composite/edit/saved-0", base).href,
    );
    await dataPreviewAction().waitFor();
    await until(() => mergeRequests.length > beforeEditMerges, "Saved source selections recompute automatically when opened");
    await previewResults().getByText("8 rows · 3 columns", { exact: true }).waitFor();
    await until(() => previews.length > beforeEditPreviews,
      "Saved chart selections preview after their data is automatically recomputed");
    await until(() => previews.at(-1).completed, "Reopened saved chart preview completes");
    await page
      .getByRole("textbox", {
        name: "Series label for Access count",
        exact: true,
      })
      .fill("Recovered access label");
    await until(() => [...drafts.values()].some((draft) => draft.sourceIndicatorId === "saved-0"
      && draft.configuration.sources[0].label === "Recovered access label"),
      "Changed source labels are saved to the private edit draft");
    await page.getByRole("status").filter({ hasText: "Draft saved" }).waitFor();
    const editDraftUrl = page.url();
    assert.match(editDraftUrl, /\/indicator\/editor\/drafts\/draft-/, "Editing is canonicalized to the draft URL");
    await page.reload();
    assert.equal(
      await page
        .getByRole("textbox", {
          name: "Series label for Access count",
          exact: true,
        })
        .inputValue(),
      "Recovered access label",
      "Server-saved draft edits survive refresh without a local storage dependency",
    );
    await page
      .getByRole("textbox", {
        name: "Series label for Access count",
        exact: true,
      })
      .fill("Access count");
    await previewResults().getByText("8 rows · 3 columns", { exact: true }).waitFor();
    await button("Continue to visualization").click();
    await resultChart().waitFor();
    await saveIndicator("Composite updated", true);
    assert.match(saved[1].path, /drafts\/draft-[^/]+\/complete$/);
    assert.equal(saved[1].sourceIndicatorId, "saved-0", "Completing an edit draft updates its saved source");

    await page.goto(
      new URL("/indicator/editor/multi-level-analysis", base).href,
    );
    await select("Different method");
    await select("Access count");
    await selectionCount(2);
    assert.equal(await page.getByRole("checkbox", { name: "Same analytics method only", exact: true }).count(), 0,
      "Multilevel selection does not impose the Composite method filter");
    assert.equal(await checkbox("Deselect Different method").isChecked(), true,
      "Multilevel can actually select a different analytics method");
    await button("Start over").click();
    await page.getByRole("dialog", { name: "Start a new indicator?", exact: true })
      .getByRole("button", { name: "Start over", exact: true }).click();
    await selectionCount(0);
    await select("Access count");
    assert.equal(
      await checkbox("Select Different method").isDisabled(),
      false,
      "Multilevel can use another method",
    );
    await select("Annotation count");
    const beforeMultiMerge = mergeRequests.length;
    await button("Continue to combine data").click();
    await page
      .getByRole("region", { name: "Preview results", exact: true })
      .getByText("6 rows · 3 columns", { exact: true })
      .waitFor();
    assert.equal(mergeRequests.length, beforeMultiMerge + 1,
      "Multilevel preselected source columns automatically generate their first combined preview");
    await checkCombineLayout("Annotation count");
    await checkAutomaticCombine("MULTI_LEVEL");
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
    await page
      .getByRole("region", { name: "Preview results", exact: true })
      .getByRole("cell", { name: "Cluster 1", exact: true })
      .first()
      .waitFor();
    assert.equal(analysisRequests.length, 1,
      "Multilevel valid preselected method inputs and defaults run the first analysis automatically");
    await checkAutomaticAnalysis();
    await button("Continue to visualization").click();
    await chooseLibrary();
    await generateChart("Scatter plot");
    await checkEditorNavigation("MULTI_LEVEL");
    await checkAutomaticUpdates("Scatter plot", "MULTI_LEVEL");
    await checkVisualizationDesign("Scatter plot");
    await saveIndicator("Multilevel fixture");
    assert.equal(saved[2].indicatorType, "MULTI_LEVEL");
    }
    await page.goto(new URL("/indicator/editor/composite", base).href);
    await checkbox("Select Access count").waitFor();
    assert.equal(await checkbox("Select Access count").isDisabled(), false,
      "A fresh editor after saving has no recovered source selections");
    await select("Access count");
    await select("Student count");
    await page.getByRole("status").filter({ hasText: "Draft saved" }).waitFor();
    await until(() => [...drafts.values()].some((draft) => draft.status === "DRAFT"
      && draft.indicatorType === "COMPOSITE" && draft.configuration.sources.length === 2),
      "The new Composite draft is durably saved before refresh");
    const freshDraftUrl = page.url();
    assert.match(freshDraftUrl, /\/indicator\/editor\/drafts\/draft-/);
    await page.reload();
    await previewResults().getByText("8 rows · 3 columns", { exact: true }).waitFor();
    await page.getByRole("region", { name: "Select indicators step", exact: true })
      .getByRole("button", { name: "Open", exact: true }).click();
    await page
      .getByRole("region", { name: "Selected indicators", exact: true })
      .getByText("Student count", { exact: true })
      .waitFor();
    await button("Remove Student count").click();
    await page.getByRole("dialog", { name: "Remove this source?", exact: true })
      .getByRole("button", { name: "Remove source", exact: true }).click();
    await button("Undo").click();
    await page.setViewportSize({ width: 390, height: 844 });
    await button("Continue to combine data").click();
    await page
      .getByRole("region", { name: "Preview results", exact: true })
      .getByText("8 rows · 3 columns", { exact: true }).waitFor();
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
    assert.equal(await checkbox("Select Access count").isChecked(), false,
      "Confirmed reset clears this draft's source selection");
    await button("Save draft").click();
    await page.getByRole("status").filter({ hasText: "Draft saved" }).waitFor();
    await select("Access count");
    await select("Student count");
    draftWritePlans.push({ fail: true, delayMs: 200 });
    await page.getByRole("textbox", { name: "Indicator name", exact: true }).fill("Draft durability fixture");
    await button("Save draft and exit").click();
    await page.getByRole("alert").filter({ hasText: "Draft storage temporarily unavailable" }).waitFor();
    assert.match(page.url(), /\/indicator\/editor\/drafts\/draft-/, "A failed draft flush cannot navigate away");
    assert.equal(await page.getByRole("textbox", { name: "Indicator name", exact: true }).inputValue(), "Draft durability fixture");
    assert.equal(await checkbox("Deselect Access count").isChecked(), true, "A failed save retains selected sources");
    await button("Retry save").click();
    await page.getByRole("status").filter({ hasText: "Draft saved" }).waitFor();
    const durableDraftUrl = page.url();
    const durableDraft = [...drafts.values()].find((draft) => draft.name === "Draft durability fixture");
    assert.equal(durableDraft.configuration.sources.length, 2, "Retry saves the latest full selection");
    assert.equal(durableDraft.configuration.mergedData, undefined, "Drafts exclude computed rows");
    assert.equal(durableDraft.configuration.visualization.previewData, undefined, "Drafts exclude executable preview markup");
    const completedBeforeExit = saved.length;
    await button("Save draft and exit").click();
    await page.waitForURL("**/indicator");
    assert.equal(saved.length, completedBeforeExit, "Saving an incomplete draft does not create an executable indicator");
    const previousPage = page;
    page = await context.newPage();
    page.on("pageerror", (error) => pageErrors.push(error.stack || error.message));
    await previousPage.close();
    await page.goto(durableDraftUrl);
    await page.getByRole("textbox", { name: "Indicator name", exact: true }).waitFor();
    assert.equal(await page.getByRole("textbox", { name: "Indicator name", exact: true }).inputValue(), "Draft durability fixture",
      "A second tab resumes the authoritative server draft without the previous sessionStorage");
    await page.getByRole("region", { name: "Combine data step", exact: true }).waitFor();
    // Let the resumed editor's catalog load settle before deliberately replacing
    // the whole document; WebKit reports interrupted XHRs as browser errors.
    await page.waitForLoadState("networkidle");
    await page.goto(new URL("/indicator/editor/composite", base).href);
    await checkbox("Select Access count").waitFor();
    assert.equal(await checkbox("Select Access count").isChecked(), false, "Starting a second draft does not rehydrate an older draft");
    assert.equal(drafts.get(durableDraft.id).configuration.sources.length, 2, "Starting another indicator does not destroy the previous draft");
    await page.waitForLoadState("networkidle");
    await page.goto(durableDraftUrl);
    await page.getByRole("status").filter({ hasText: "Draft saved" }).waitFor();
    await button("Discard draft").click();
    let discardDialog = page.getByRole("dialog", { name: "Discard this draft?", exact: true });
    await discardDialog.waitFor();
    assert.ok(drafts.has(durableDraft.id), "Opening discard confirmation retains the clean server draft");
    await discardDialog.getByRole("button", { name: "Stay here", exact: true }).click();
    await discardDialog.waitFor({ state: "hidden" });
    await button("Discard draft").click();
    discardDialog = page.getByRole("dialog", { name: "Discard this draft?", exact: true });
    await discardDialog.getByRole("button", { name: "Discard draft", exact: true }).click();
    await page.waitForURL("**/indicator");
    assert.equal(drafts.has(durableDraft.id), false, "Confirmed discard deletes only the selected private draft");
    assert.equal(draftReceipts.get(durableDraft.id).status, "DISCARDED", "Discard is acknowledged by a terminal server receipt");
    assert.equal(draftReceipts.get(durableDraft.id).configuration, null, "The terminal receipt retains no authoring configuration");
    assert.equal(saved.length, completedBeforeExit, "Discarding an incomplete draft preserves saved indicators");
    const openBlockedDeletion = async () => {
      await page.getByRole("textbox", { name: "Search indicators", exact: true }).fill("Access count");
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
    console.log(process.env.OPENLAP_COMPLEX_DRAFT_ONLY === "1"
      ? "PASS: private server draft save/refresh/second-tab resume, latest-state failure retry and save-and-exit, independent draft creation, confirmed clean-draft discard, no computed data or executable preview storage, saved-indicator preservation and blocked source deletion; no browser errors."
      :
      "PASS: compact source table server sorting/filtering/pagination, persistent checked selections and max10 feedback, owner-scoped on-demand chart/data inspection with retry/focus/stale-response protection; Composite same-method selection, recovery/retry,8-row union+filled zeros, grouped mappings/create/directedit/update/saved current table; Multilevel6-row intersection, two-feature analysis, scatter/save; responsive two-column combine panels and automatic data/analysis previews for valid preselected choices, incomplete-input and integer-parameter gating, explicit failure retry, no request loops, name-only edit stability and stale-response protection; new/edit server draft resume, failed-completion preservation, revision-checked saves and delayed-navigation completion cleanup, confirmed reset, metadata retry, undo, mobile containment; blocked source deletion retains source and safely links its dependents; automatic chart selection/mapping/customization previews, invalid-input gating, explicit retry, stale catalog-error recovery and stale-response suppression for both types; no browser errors.",
    );
  } catch (error) {
    console.error("Synthetic browser diagnostics:", { pageErrors, failures,
      latestQueries: sourceCatalogRequests.slice(-3), latestRequests: requests.slice(-8) });
    if (page) console.error("Visible fixture state:", await page.evaluate(() => ({
      text: document.body.innerText.slice(0, 2200),
      checkboxes: [...document.querySelectorAll('input[type="checkbox"]')].map((input) => ({
        name: input.getAttribute('aria-label'), checked: input.checked, disabled: input.disabled,
      })),
    })).catch(() => "Page unavailable"));
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
