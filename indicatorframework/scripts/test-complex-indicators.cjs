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
    chartConfiguration: {},
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
    chartConfiguration: {},
  },
];
const chartMarkup =
  '<svg width="600" height="350" role="img" aria-label="Synthetic result chart"><title>Synthetic result chart</title><rect width="300" height="200" fill="blue" /></svg>';
const code = encodeURIComponent(
  `<div id="complex-test-chart"></div><script>document.getElementById("complex-test-chart").innerHTML=${JSON.stringify(chartMarkup)};</script>`,
);
const failures = [],
  pageErrors = [],
  saved = [],
  requests = [];
let failMerge = true;

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
      if (path === "v1/analytics/methods/input-params/kmeans")
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
      )
        return send(code);
      if (
        /^v1\/indicators\/(composite|multilevel)\/(create|[^/]+\/update)$/.test(
          path,
        )
      ) {
        assert.equal(JSON.parse(body.configuration).type, body.indicatorType);
        assert.equal(JSON.parse(body.configuration).schemaVersion, 1);
        assert.equal(body.indicators.length, 2);
        saved.push({ path, ...body });
        return send(null);
      }
      if (path === "v1/indicators/my")
        return send({
          content: saved.map((item, index) => ({
            id: "saved-" + index,
            name: item.name,
            indicatorName: item.name,
            type: item.indicatorType,
          })),
          totalElements: saved.length,
          pageable: { pageSize: 10, pageNumber: 0 },
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
        .getByRole("combobox", { name: "Library", exact: true })
        .click();
      await page
        .getByRole("option", { name: "Synthetic charts", exact: true })
        .click();
    };
    const generateChart = async (name) => {
      await button("Select " + name).click();
      await button("Generate chart preview").click();
      await page
        .getByRole("img", { name: "Synthetic result chart", exact: true })
        .waitFor();
    };
    const saveIndicator = async (name, update = false) => {
      await button(update ? "Review changes" : "Save indicator").click();
      const dialog = page.getByRole("dialog", {
        name: /(?:Save|Update) (?:composite|multilevel analysis) indicator/,
      });
      await dialog.getByRole("textbox", { name: "Indicator name" }).fill(name);
      await dialog
        .getByRole("button", {
          name: update ? "Update indicator" : "Save indicator",
          exact: true,
        })
        .click();
      await page.waitForURL("**/indicator");
      await page
        .getByRole("heading", { name: "My Indicators", exact: true })
        .waitFor();
    };

    await page.goto(new URL("/indicator/editor/composite", base).href);
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
    await button("Generate combined data").click();
    await page
      .getByRole("alert")
      .filter({ hasText: "Source data temporarily unavailable" })
      .waitFor();
    await button("Generate combined data").click();
    const combined = page.getByRole("region", {
      name: "Combined data preview",
      exact: true,
    });
    await combined.getByText("8 rows · 3 columns", { exact: true }).waitFor();
    await combined.getByText(/4 cells were filled with zero/).waitFor();
    await button("Continue to visualization").click();
    await chooseLibrary();
    await generateChart("Grouped bar");
    await saveIndicator("Composite fixture");
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
    await page.goto(
      new URL("/indicator/editor/composite/edit/saved-0", base).href,
    );
    await button("Generate combined data").waitFor();
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
    await button("Generate combined data").click();
    await button("Continue to visualization").click();
    await button("Generate chart preview").click();
    await page
      .getByRole("img", { name: "Synthetic result chart", exact: true })
      .waitFor();
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
    await button("Generate combined data").click();
    await page
      .getByRole("region", { name: "Combined data preview", exact: true })
      .getByText("6 rows · 3 columns", { exact: true })
      .waitFor();
    await button("Continue to analysis").click();
    await page
      .getByRole("combobox", { name: "Analytics method", exact: true })
      .click();
    await page
      .getByRole("option", { name: "K-Means clusters", exact: true })
      .click();
    await button("Generate analysis preview").click();
    await page
      .getByRole("region", { name: "Analysis data preview", exact: true })
      .getByRole("cell", { name: "Cluster 1", exact: true })
      .first()
      .waitFor();
    await button("Continue to visualization").click();
    await chooseLibrary();
    await generateChart("Scatter plot");
    await saveIndicator("Multilevel fixture");
    assert.equal(saved[2].indicatorType, "MULTI_LEVEL");
    await page.goto(new URL("/indicator/editor/composite", base).href);
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
    await button("Generate combined data").click();
    await page
      .getByRole("region", { name: "Combined data preview", exact: true })
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
    assert.deepEqual(pageErrors, []);
    assert.deepEqual(failures, []);
    assert.ok(requests.includes("v1/indicators/saved-0/result"));
    console.log(
      "PASS: Composite same-method selection, recovery/retry,8-row union+filled zeros, grouped mappings/create/directedit/update/saved current table; Multilevel6-row intersection, two-feature analysis, scatter/save; tab recovery, undo, mobile containment; no browser errors.",
    );
  } finally {
    await context.close();
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
