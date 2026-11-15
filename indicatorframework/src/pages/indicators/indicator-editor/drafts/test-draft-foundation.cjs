// Requires Playwright + WebKit (or OPENLAP_PLAYWRIGHT_PATH and
// OPENLAP_WEBKIT_EXECUTABLE). Runs its own isolated Vite fixture on loopback;
// never authenticates or contacts an OpenLAP backend.
const assert = require("node:assert/strict");
const path = require("node:path");
const { webkit } = require(process.env.OPENLAP_PLAYWRIGHT_PATH || "playwright");
const root = path.resolve(__dirname, "../../../../..");
const entry = "/src/pages/indicators/indicator-editor/drafts/fixtures/draft-foundation-fixture.jsx";
(async () => {
  const { createServer } = await import("vite");
  let server, browser;
  const errors = [];
  try {
    server = await createServer({ root, server: { host: "127.0.0.1", port: Number(process.env.OPENLAP_DRAFT_FIXTURE_PORT || 5197), strictPort: true },
      plugins: [{ name: "draft-foundation-fixture", configureServer(vite) {
        vite.middlewares.use(async (request, response, next) => {
          if (!request.url?.startsWith("/__draft_fixture")) return next();
          const html = await vite.transformIndexHtml(request.url, `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="${entry}"></script></body></html>`);
          response.setHeader("Content-Type", "text/html"); response.end(html);
        });
      } }],
    });
    await server.listen();
    const base = `http://127.0.0.1:${server.config.server.port}`;
    browser = await webkit.launch({ headless: true, ...(process.env.OPENLAP_WEBKIT_EXECUTABLE ? { executablePath: process.env.OPENLAP_WEBKIT_EXECUTABLE } : {}) });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${base}/__draft_fixture`);
    await page.getByRole("heading", { name: "Indicator draft fixture" }).waitFor();
    assert.equal(await page.evaluate(() => window.__draftFixture.calls.length), 0, "opening an empty editor creates no ghost draft under StrictMode");
    await page.getByRole("button", { name: "Add source", exact: true }).click();
    await page.getByRole("textbox", { name: "Indicator name" }).fill("Reviewed working draft");
    await page.getByRole("status").filter({ hasText: "Draft saved" }).waitFor();
    assert.equal(await page.evaluate(() => window.__draftFixture.calls.filter((call) => call.method === "post").length), 1);
    await page.getByRole("button", { name: "Discard draft", exact: true }).click();
    await page.getByRole("dialog", { name: "Discard this draft?" }).waitFor();
    await page.getByRole("button", { name: "Stay here", exact: true }).click();
    await page.evaluate(() => { window.__draftFixture.failWrites = true; });
    await page.getByRole("button", { name: "Add source", exact: true }).click();
    await page.getByRole("alert").filter({ hasText: "Fixture offline" }).waitFor();
    await page.getByRole("button", { name: "Go to indicators", exact: true }).click();
    const leave = page.getByRole("dialog", { name: "Leave this editor?" });
    await leave.waitFor();
    await leave.getByRole("button", { name: "Save draft and leave", exact: true }).click();
    await leave.getByRole("alert").filter({ hasText: "Fixture offline" }).waitFor();
    assert.ok(!page.url().endsWith("/leave"));
    await page.evaluate(() => { window.__draftFixture.failWrites = false; });
    await leave.getByRole("button", { name: "Save draft and leave", exact: true }).click();
    await page.waitForURL("**/__draft_fixture/leave");
    assert.equal(await page.evaluate(() => Object.values(window.__draftFixture.drafts)[0].configuration.sources.length), 2);

    await page.goto(`${base}/__draft_fixture`);
    await page.getByRole("button", { name: "Add source", exact: true }).click();
    await page.getByRole("status").filter({ hasText: "Draft saved" }).waitFor();
    await page.evaluate(() => { window.__draftFixture.failWrites = true; });
    await page.getByRole("button", { name: "Add source", exact: true }).click();
    await page.getByRole("alert").filter({ hasText: "Fixture offline" }).waitFor();
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await leave.waitFor();
    await leave.getByRole("button", { name: "Save draft and leave", exact: true }).click();
    await leave.getByRole("alert").filter({ hasText: "Fixture offline" }).waitFor();
    assert.equal(await page.evaluate(() => window.__draftFixture.logoutCalls), 0, "a failed draft flush must preserve authentication");
    await page.evaluate(() => { window.__draftFixture.failWrites = false; });
    await leave.getByRole("button", { name: "Save draft and leave", exact: true }).click();
    await page.waitForURL("**/__draft_fixture/signed-out");
    assert.equal(await page.evaluate(() => window.__draftFixture.logoutCalls), 1);
    assert.equal(await page.evaluate(() => Object.values(window.__draftFixture.drafts)[0].configuration.sources.length), 2, "logout action runs only after latest payload acknowledgment");

    await page.goto(`${base}/__draft_fixture?case=conflict`);
    await page.getByRole("button", { name: "Add source", exact: true }).click();
    await page.getByRole("button", { name: "Save as separate draft", exact: true }).waitFor();
    await page.getByRole("button", { name: "Save as separate draft", exact: true }).click();
    await page.getByRole("status").filter({ hasText: "Draft saved" }).waitFor();
    assert.equal(await page.evaluate(() => window.__draftFixture.drafts["server-draft"].configuration.sources.length), 1);
    assert.equal(await page.evaluate(() => window.__draftFixture.drafts["created-1"].configuration.sources.length), 2);
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "draft header stays inside mobile viewport");
    assert.deepEqual(errors, []);
    console.log("PASS: StrictMode draft creation, server acknowledgment, confirmed discard, failed-leave/logout preservation, latest flush before logout action, separate-draft conflict recovery and mobile header.");
  } finally {
    await browser?.close();
    await server?.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
