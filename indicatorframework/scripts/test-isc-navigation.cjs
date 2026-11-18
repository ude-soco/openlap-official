// Real ISC Creator with synthetic owned drafts. No database or deployed API is
// contacted. Run against an isolated Vite/production preview with /api/ mocked.
const { webkit } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const navigation = require("./editor-navigation-assertions.cjs");
const base = new URL(process.env.OPENLAP_TEST_BASE_URL || "http://127.0.0.1:15281");
assert.equal(base.protocol, "http:");
assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(base.hostname));
assert.equal(base.username + base.password + base.search + base.hash, "");
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const labels = { requirements: "Requirements", path: "Choose path", dataset: "Dataset", visualization: "Visualization", finalize: "Finalize" };

async function fixture(browser, viewport) {
  const { getDefaultVisRef } = await import("../src/pages/indicator-specification-cards/creator/utils/isc-workflow-reset.js");
  const categorical = { type: "string", value: "Categorical" }, numerical = { type: "number", value: "Numerical" };
  const domain = {
    requirements: { goalType: { id: "monitor", verb: "monitor", category: "Monitoring", description: "", custom: false, active: true },
      goal: "Monitor use of synthetic materials", question: "Which materials are accessed?", indicatorName: "Retained ISC navigation choices", selectedPath: "",
      data: [{ id: "material", value: "Material", type: categorical }, { id: "count", value: "Accesses", type: numerical }],
      edit: { goal: false, question: false, indicatorName: true }, show: { goal: true, question: true, indicatorName: true } },
    dataset: { file: { name: "" }, columns: [
      { field: "material", headerName: "Material", type: "string", dataType: categorical },
      { field: "count", headerName: "Accesses", type: "number", dataType: numerical },
    ], rows: [{ id: "first", material: "Lecture", count: 12 }, { id: "second", material: "Assignment", count: 9 }, { id: "third", material: "Exercise", count: 7 }] },
    visRef: getDefaultVisRef(), lockedStep: {
      requirements: { locked: false, openPanel: true, step: "1" }, path: { locked: true, openPanel: false, step: "2" },
      dataset: { locked: true, openPanel: false, step: "0" }, visualization: { locked: true, openPanel: false, step: "0" },
      finalize: { locked: true, openPanel: false, step: "5" },
    },
  };
  const id = "synthetic-isc-navigation", owner = "isc.navigation@example.test";
  const token = "e30." + Buffer.from(JSON.stringify({ sub: owner, roles: ["ROLE_USER"], exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url") + ".fixture";
  const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
  const calls = [], errors = [];
  await context.addInitScript(({ token, domain, id }) => {
    localStorage.setItem("authTokens", JSON.stringify({ access_token: token, refresh_token: token }));
    if (!sessionStorage.getItem("session_isc")) sessionStorage.setItem("session_isc", JSON.stringify({ id: null, ...domain,
      draftMeta: { mode: "NEW_DRAFT", draftId: id, sourceId: null, status: "DRAFT", lastAutosavedAt: null, autosaveError: null } }));
  }, { token, domain, id });
  await context.routeWebSocket(/.*/, (socket) => socket.close());
  await context.route("**/*", (route) => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== base.origin) { errors.push(`Off-origin request ${url.origin}`); return route.abort(); }
    if (!url.pathname.startsWith("/api/")) return route.continue();
    const endpoint = url.pathname.slice(5), method = request.method();
    const body = request.postData() ? request.postDataJSON() : null;
    calls.push({ endpoint, method, body });
    const send = (data, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
    if (endpoint === "v1/users/my") return send({ data: { name: "Synthetic ISC viewer", email: owner, roles: ["ROLE_USER"] } });
    if (endpoint === "v1/analytics/goals") return send({ data: [domain.requirements.goalType] });
    if (endpoint === `v1/isc/drafts/${id}` && method === "PUT") {
      assert.deepEqual(Object.keys(body).sort(), ["dataset", "lockedStep", "requirements", "visRef"]);
      return send({ message: "Draft saved." });
    }
    errors.push(`Unexpected API ${method} ${endpoint}`); return send({ message: "Unexpected synthetic API." }, 500);
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on("pageerror", (error) => errors.push(error.message));
  return { context, page, calls, errors };
}

const session = (page) => page.evaluate(() => JSON.parse(sessionStorage.getItem("session_isc")));
const inputs = (value) => ({ requirements: value.requirements, dataset: value.dataset, visRef: value.visRef });
const lockCodes = (value) => Object.fromEntries(Object.entries(value.lockedStep).map(([key, item]) => [key, { locked: item.locked, step: item.step }]));
const section = (page, key) => page.locator(`[data-editor-step="${key}"]`);
const next = (page, key) => section(page, key).getByRole("button", { name: "Next", exact: true });

async function lockedPath(f) {
  const { page } = f, nav = navigation.navigator(page);
  const menuButton = nav.locator('button[aria-haspopup="menu"]');
  if (await menuButton.count()) await menuButton.click();
  const control = await menuButton.count() ? page.getByRole("menuitem", { name: /^Choose path,/ }) : nav.getByRole("button", { name: /^Choose path,/ });
  assert.equal(await control.getAttribute("aria-disabled"), "true", "Path selection is locked until requirements are confirmed");
  const before = await session(page), calls = f.calls.length;
  await control.evaluate((element) => element.click());
  await pause(100);
  assert.deepEqual(await session(page), before, "A locked jump changes neither requirements nor progress");
  assert.equal(f.calls.length, calls, "A locked jump does not send a request");
  if (await menuButton.count()) {
    assert.match(await control.getAttribute("aria-label"), /requirements/i, "The menu exposes the prerequisite while its modal is open");
    await page.keyboard.press("Escape");
    await navigation.until(() => menuButton.evaluate((element) => element === document.activeElement), "Closing the menu restores trigger focus");
  }
  await nav.getByRole("status").filter({ hasText: /requirements/i }).waitFor();
}

async function navOrder(page) {
  const nav = navigation.navigator(page), trigger = nav.locator('button[aria-haspopup="menu"]');
  if (await trigger.count()) {
    await trigger.click();
    const order = await page.getByRole("menuitem").evaluateAll((items) => items.map((item) => item.getAttribute("aria-controls")?.split("-").at(-1)).filter(Boolean));
    await page.keyboard.press("Escape"); return order;
  }
  return nav.locator("button[aria-controls]").evaluateAll((buttons) => buttons.map((button) => button.getAttribute("aria-controls").split("-").at(-1)));
}

async function unchosenMiddleStepsAbsent(page, stage) {
  const nav = navigation.navigator(page), trigger = nav.locator('button[aria-haspopup="menu"]');
  const capture = async (suffix = "") => {
    const directory = process.env.OPENLAP_ISC_NAVIGATION_SCREENSHOT_DIR;
    if (!directory) return;
    await fs.mkdir(directory, { recursive: true });
    await pause(350);
    await page.screenshot({ path: path.join(directory, `${stage.startsWith("Before") ? "before-requirements" : "before-path"}-${page.viewportSize().width}${suffix}.png`) });
  };
  if (await trigger.count()) {
    await trigger.click();
    assert.equal(await page.locator('[role="menuitem"][aria-label^="Dataset,"], [role="menuitem"][aria-label^="Visualization,"]').count(), 0,
      `${stage}: Dataset and Visualization are absent from the menu DOM, not merely disabled`);
    assert.deepEqual(await page.getByRole("menuitem").evaluateAll((items) => items.map((item) => item.getAttribute("aria-label").split(",")[0])),
      ["Requirements", "Choose path", "Finalize"], `${stage}: the compact menu contains only the currently placed phases`);
    await capture("-menu");
    await page.keyboard.press("Escape");
    await navigation.until(() => trigger.evaluate((element) => element === document.activeElement), "Closing the compact menu returns focus to its trigger");
  } else {
    assert.equal(await nav.locator('button[aria-label^="Dataset,"], button[aria-label^="Visualization,"]').count(), 0,
      `${stage}: Dataset and Visualization are absent from the desktop navigator DOM, not merely disabled`);
    assert.deepEqual(await nav.locator("button[aria-label]").evaluateAll((buttons) => buttons.map((button) => button.getAttribute("aria-label").split(",")[0])),
      ["Requirements", "Choose path", "Finalize"], `${stage}: the desktop navigator contains only the currently placed phases`);
    await capture();
  }
  assert.equal(await section(page, "dataset").count(), 0, `${stage}: Dataset has no section before a path is chosen`);
  assert.equal(await section(page, "visualization").count(), 0, `${stage}: Visualization has no section before a path is chosen`);
}

async function checkWorkflow(browser, viewport, pathChoice) {
  const f = await fixture(browser, viewport), { page } = f;
  let stage = "opening requirements";
  try {
    await page.goto(new URL("/isc/creator", base).href);
    await navigation.navigator(page).waitFor();
    await next(page, "requirements").waitFor();
    await pause(2300);
    await unchosenMiddleStepsAbsent(page, "Before confirming Requirements");
    await lockedPath(f);
    await navigation.assertCurrent(page, "Requirements");
    stage = "choosing the starting path";
    await next(page, "requirements").click();
    await section(page, "path").getByRole("button", { name: new RegExp(`^${pathChoice}\\.`) }).waitFor();
    await unchosenMiddleStepsAbsent(page, "After confirming Requirements but before choosing a path");
    await section(page, "path").getByRole("button", { name: new RegExp(`^${pathChoice}\\.`) }).click();
    const first = pathChoice === "Dataset" ? "dataset" : "visualization";
    const second = first === "dataset" ? "visualization" : "dataset";
    await navigation.until(async () => (await session(page)).lockedStep[first].locked === false, "The chosen path unlocks its first middle phase");
    assert.equal((await session(page)).lockedStep[second].locked, true, "Navigation cannot skip the second middle phase");
    await navigation.chooseStep(page, labels[first], first);
    if (first === "dataset") {
      assert.equal(await next(page, first).isEnabled(), true, "The real synthetic dataset satisfies the existing gate");
      await next(page, first).click();
      await navigation.chooseStep(page, "Visualization", "visualization");
    }
    stage = "confirming visualization and dataset";
    if (pathChoice === "Task") await section(page, "visualization").getByRole("button", { name: /^Task: Distribution\./ }).click();
    await section(page, "visualization").getByRole("button", { name: /^Bar chart\. / }).click();
    await next(page, "visualization").click();
    if (second === "dataset") {
      await navigation.chooseStep(page, "Dataset", "dataset");
      await next(page, "dataset").click();
    }
    await navigation.until(async () => (await session(page)).lockedStep.finalize.locked === false, "Only the existing valid transition unlocks Finalize");
    const order = ["requirements", "path", first, second, "finalize"];
    assert.deepEqual(await navOrder(page), order, "The navigation follows the path's persisted phase positions");
    stage = "restoring the chosen path";
    await pause(2300);
    await page.reload();
    await navigation.navigator(page).waitFor();
    assert.equal((await session(page)).requirements.selectedPath, pathChoice, "Reload restores the explicit starting-path choice");
    assert.deepEqual(await navOrder(page), order, "Reload shows both middle phases in the chosen path's persisted order");
    stage = "jumping among all five sections";
    await navigation.chooseStep(page, "Requirements", "requirements");
    await pause(2300);
    const before = await session(page), beforeInputs = inputs(before), codes = lockCodes(before);
    for (const key of ["path", first, second, "finalize", "requirements"]) {
      await navigation.chooseStep(page, labels[key], key);
      await pause(850);
      assert.deepEqual(inputs(await session(page)), beforeInputs, `Reopening ${key} preserves requirements, real rows, chosen chart and customization`);
      assert.deepEqual(lockCodes(await session(page)), codes, `Reopening ${key} does not unlock or reorder phases`);
    }
    if (viewport.width >= 1200) {
      await navigation.chooseStep(page, "Dataset", "dataset"); await pause(850);
      const rail = page.getByRole("region", { name: "Dataset status and guidance", exact: true });
      const clearance = await rail.evaluate((element) => {
        const nav = element.closest("[data-editor-workflow]").querySelector("[data-editor-navigation]");
        const header = document.querySelector("[data-app-header]");
        return { top: parseFloat(getComputedStyle(element).top), position: getComputedStyle(element).position,
          minimum: header.getBoundingClientRect().bottom + nav.getBoundingClientRect().height + 8 };
      });
      assert.equal(clearance.position, "sticky");
      assert.ok(clearance.top >= clearance.minimum, "Dataset guidance accounts for both the app header and persistent navigator");
      await navigation.chooseStep(page, "Requirements", "requirements");
    }
    stage = "tracking scrolling without editing";
    await pause(2300);
    const retained = await session(page), requests = f.calls.length;
    const focus = await section(page, "requirements").evaluate((element) => { element.focus({ preventScroll: true }); return element.id; });
    for (const key of ["path", first, second]) {
      await navigation.scrollToStep(page, key);
      await navigation.assertCurrent(page, labels[key]);
      assert.equal(await page.evaluate(() => document.activeElement.id), focus, "Scrolling does not steal focus");
    }
    await pause(2300);
    assert.deepEqual(await session(page), retained, "Passive orientation tracking preserves the complete recovery document");
    assert.equal(f.calls.length, requests, "Scrolling does not trigger autosave, publishing or API execution");
    if (viewport.width < 800) {
      const trigger = navigation.navigator(page).locator('button[aria-haspopup="menu"]');
      assert.equal(await trigger.count(), 1, "The five ISC phases use a compact menu in a narrow editor");
      await trigger.focus(); await page.keyboard.press("Enter");
      await page.getByRole("menuitem", { name: /^Requirements,/ }).focus(); await page.keyboard.press("Enter");
      await navigation.assertLanding(page, "Requirements", "requirements");
    }
    await navigation.assertNoOverflow(page);
    if (process.env.OPENLAP_ISC_NAVIGATION_SCREENSHOT_DIR) {
      await navigation.chooseStep(page, "Dataset", "dataset"); await pause(850);
      await fs.mkdir(process.env.OPENLAP_ISC_NAVIGATION_SCREENSHOT_DIR, { recursive: true });
      await page.screenshot({ path: path.join(process.env.OPENLAP_ISC_NAVIGATION_SCREENSHOT_DIR, `${pathChoice.toLowerCase()}-${viewport.width}.png`) });
    }
    assert.deepEqual(f.errors, []);
    console.log(`PASS ISC ${pathChoice} first ${viewport.width}×${viewport.height}: unchosen phases absent, actual progression, restored five-step order, locked prerequisites, jumps/focus, retained data and passive scroll tracking`);
  } catch (error) {
    console.error(`ISC navigation failed while ${stage}: ${JSON.stringify(f.errors)}`);
    throw error;
  } finally { await f.context.close(); }
}

(async () => {
  const browser = await webkit.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) });
  try {
    await checkWorkflow(browser, { width: 1680, height: 1000 }, "Dataset");
    await checkWorkflow(browser, { width: 1680, height: 1000 }, "Visualization");
    await checkWorkflow(browser, { width: 1680, height: 1000 }, "Task");
    await checkWorkflow(browser, { width: 390, height: 844 }, "Dataset");
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
