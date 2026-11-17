// Real navigation/Collapse/reference components in a synthetic app shell.
// Run against loopback Vite with the same pinned WebKit as the full-app drivers.
const { webkit } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { navigator, chooseStep, assertLanding, assertCurrent, assertNoOverflow, until } = require("./editor-navigation-assertions.cjs");
const base = new URL(process.env.OPENLAP_TEST_BASE_URL || "http://127.0.0.1:15281");
assert.equal(base.protocol, "http:");
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(base.hostname));
assert.equal(base.username + base.password + base.search + base.hash, "");
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function openFixture(browser, viewport, { embedded = false, short = false, reducedMotion = "reduce" } = {}) {
  const context = await browser.newContext({ viewport, reducedMotion });
  const errors = [];
  await context.addInitScript(() => {
    window.__navigationEvents = [];
    for (const type of ["keydown", "keyup", "click", "focusin"]) window.addEventListener(type, (event) => {
      window.__navigationEvents.push({ type, key: event.key, target: event.target.getAttribute?.("aria-label") || event.target.textContent?.slice(0, 60),
        focusedStep: document.activeElement.closest?.("[data-editor-step]")?.dataset.editorStep, active: document.activeElement.tagName });
      if (window.__navigationEvents.length > 60) window.__navigationEvents.shift();
    });
  });
  await context.routeWebSocket(/.*/, (socket) => socket.close());
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== base.origin || url.pathname.startsWith("/api/")) {
      errors.push(`Unexpected request: ${route.request().method()} ${url.origin}${url.pathname}`);
      return route.abort();
    }
    return route.continue();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    const url = new URL("scripts/fixtures/editor-navigation.html", base);
    if (embedded) url.searchParams.set("embedded", "1");
    if (short) url.searchParams.set("short", "1");
    await page.goto(url.href);
    await navigator(page).waitFor();
  } catch (failure) {
    console.error("Navigation fixture startup errors:", errors);
    await context.close();
    throw failure;
  }
  assert.ok(await page.evaluate(async () => { const faces = await document.fonts.load("14px Inter"); await document.fonts.ready; return faces.length; }), "Actual Inter font loads before geometry checks");
  return { context, page, errors };
}

async function coldShortEditor(browser) {
  const f = await openFixture(browser, { width: 1680, height: 1000 }, { short: true });
  try {
    assert.ok(await f.page.evaluate(() => document.documentElement.scrollHeight <= innerHeight), "A cold short editor fits without page scrolling");
    await f.page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await assertCurrent(f.page, "Dataset");
    assert.equal(await f.page.evaluate(() => scrollY), 0, "Initial orientation does not move the page");
    await assertNoOverflow(f.page);
    assert.deepEqual(f.errors, []);
    console.log("PASS a cold short editor keeps its initial Dataset orientation instead of highlighting the last locked step");
  } finally { await f.context.close(); }
}

async function selectionSnapshot(page) {
  return page.evaluate(() => { const { selections, calls } = window.__editorNavigationFixture.snapshot(); return { selections, calls }; });
}

async function scrollOnly(page) {
  const field = page.getByRole("textbox", { name: "Filters retained choice", exact: true });
  await field.click();
  await field.fill("A choice retained while navigating");
  const before = await selectionSnapshot(page);
  const focus = await field.evaluate((element) => { element.focus({ preventScroll: true }); return element.id; });
  // A real user scroll interrupts any bounded accordion-alignment jump.
  await page.mouse.wheel(0, 1);
  for (const [key, label] of [["dataset", "Dataset"], ["filters", "Filters"], ["analysis", "Analysis"]]) {
    await page.locator(`[data-editor-step="${key}"]`).evaluate((element) => window.scrollTo({ top: scrollY + element.getBoundingClientRect().top + 300, behavior: "instant" }));
    await assertCurrent(page, label);
    assert.equal(await page.evaluate(() => document.activeElement.id), focus, "Scrolling updates orientation without stealing editing focus");
  }
  assert.deepEqual(await selectionSnapshot(page), before, "Scrolling neither changes selections nor calls the workflow's selection callback");
}

async function assertHeaderAndReference(page, height) {
  await chooseStep(page, "Analysis", "analysis");
  await page.mouse.wheel(0, 1);
  const reference = page.locator('[data-community-reference="analysis"]');
  await until(() => page.locator("[data-editor-workflow] .MuiCollapse-root").evaluateAll((elements) => elements.every((element) => element.classList.contains("MuiCollapse-entered") || element.classList.contains("MuiCollapse-hidden"))), "All workflow and reference opening animations finish");
  await until(() => reference.evaluate((element) => {
    const collapse = element.closest(".MuiCollapse-root");
    return !collapse || getComputedStyle(collapse).overflowY !== "hidden";
  }), "The workflow's opening animation finishes before measuring its sticky reference");
  await reference.evaluate((element) => {
    const nav = element.closest("[data-editor-workflow]").querySelector("[data-editor-navigation]");
    const header = document.querySelector(".MuiAppBar-root");
    const grid = element.parentElement.getBoundingClientRect();
    const top = header.getBoundingClientRect().bottom + nav.getBoundingClientRect().height + 16;
    // Stay inside the sticky interval. Near a step's bottom the rail must
    // release upward instead of overlapping the next step.
    const start = scrollY + grid.top - top + 12;
    const end = scrollY + grid.bottom - element.getBoundingClientRect().height - top - 12;
    window.scrollTo({ top: start + Math.max(0, Math.min(80, (end - start) / 2)), behavior: "instant" });
  });
  await pause(50);
  const geometry = await reference.evaluate((element) => {
    const nav = element.closest("[data-editor-workflow]").querySelector("[data-editor-navigation]");
    const header = document.querySelector(".MuiAppBar-root");
    const rect = (node) => { const box = node.getBoundingClientRect(); return { top: box.top, bottom: box.bottom, height: box.height }; };
    return { header: rect(header), nav: rect(nav), reference: rect(element), position: getComputedStyle(element).position };
  });
  assert.ok(geometry.nav.top >= geometry.header.bottom - 1 && geometry.nav.top < geometry.header.bottom + 20, "Navigator remains directly below the fixed app header");
  assert.ok(geometry.nav.height <= 100, "The navigator stays compact instead of displaying long summaries");
  assert.equal(geometry.position, height <= 360 ? "static" : "sticky");
  if (height > 360) {
    assert.ok(geometry.reference.top >= geometry.nav.bottom + 7, `Community reference clears the complete measured navigation bar: ${JSON.stringify(geometry)}`);
    assert.ok(geometry.reference.bottom <= height - 7, "Reference fits below both sticky bars within the viewport");
    const body = page.locator('[data-community-reference-body="analysis"]');
    await body.evaluate((element) => { element.scrollTop = element.scrollHeight; });
    assert.ok(await body.evaluate((element) => element.scrollTop > 0), "Long references retain their independently scrollable body");
    const summary = reference.getByRole("button", { name: /^Community reference/ });
    assert.ok(await summary.evaluate((element) => element.getBoundingClientRect().top >= element.closest("[data-editor-workflow]").querySelector("[data-editor-navigation]").getBoundingClientRect().bottom), "Reference heading remains visible while its body scrolls");
  }
}

async function lockedStep(page) {
  const nav = navigator(page), menu = nav.locator('button[aria-haspopup="menu"]');
  if (await menu.count()) await menu.click();
  const control = await menu.count() ? page.getByRole("menuitem", { name: /^Visualization/ }) : nav.getByRole("button", { name: /^Visualization/ });
  assert.equal(await control.getAttribute("aria-disabled"), "true", "Locked navigation communicates its unavailable state");
  const before = await selectionSnapshot(page);
  await control.evaluate((element) => element.click());
  await pause(50);
  assert.deepEqual(await selectionSnapshot(page), before, "Activating a locked destination cannot bypass its prerequisite");
  const hint = await menu.count() ? await control.getAttribute("aria-label") : await nav.getByRole("status").innerText();
  assert.match(hint, /Complete Analysis/, "A locked destination explains its prerequisite");
  if (await menu.count()) {
    await page.keyboard.press("Escape");
    await page.getByRole("menu").waitFor({ state: "hidden" });
    await until(() => menu.evaluate((element) => element === document.activeElement), "Escape restores focus to the compact navigation trigger");
  }
}

async function busyEditor(page) {
  await page.getByRole("button", { name: "Toggle busy editor", exact: true }).click();
  const before = await selectionSnapshot(page);
  await navigator(page).locator("button").evaluateAll((buttons) => buttons.forEach((button) => button.click()));
  await pause(50);
  assert.deepEqual(await selectionSnapshot(page), before, "A busy editor cannot navigate or change selections");
  assert.equal(await page.getByRole("menu").count(), 0, "A busy editor cannot open the compact navigation menu");
  await page.getByRole("button", { name: "Toggle busy editor", exact: true }).click();
}

async function scenario(browser, viewport, options = {}) {
  const f = await openFixture(browser, viewport, options);
  try {
    const { page } = f;
    assert.equal(await navigator(page).getByText(/deliberately lengthy analytics/).count(), 0, "Detailed method summaries stay in their workflow section");
    await busyEditor(page);
    await lockedStep(page);
    await chooseStep(page, "Analysis", "analysis");
    await page.getByRole("textbox", { name: "Analysis retained choice", exact: true }).waitFor();
    await assertCurrent(page, "Analysis");
    await chooseStep(page, "Filters", "filters");
    await scrollOnly(page);
    await chooseStep(page, "Dataset", "dataset");
    await page.getByRole("region", { name: "Dataset fixture step", exact: true }).getByRole("button", { name: "Close Dataset", exact: true }).click();
    await chooseStep(page, "Dataset", "dataset");
    await page.getByRole("textbox", { name: "Dataset retained choice", exact: true }).waitFor();
    if (viewport.width >= 1500 && !options.embedded) await assertHeaderAndReference(page, viewport.height);
    const menu = navigator(page).locator('button[aria-haspopup="menu"]');
    if (viewport.width <= 1024 || options.embedded) {
      assert.equal(await menu.count(), 1, "Narrow editor containers use one compact step menu");
      await menu.focus(); await page.keyboard.press("Enter");
      const item = page.getByRole("menuitem", { name: /^Filters/ });
      await item.focus(); await page.keyboard.press("Enter");
      await assertLanding(page, "Filters", "filters");
      await assertCurrent(page, "Filters");
      assert.equal(await page.getByRole("menu").count(), 0, "Selecting a compact-menu destination closes the menu");
      await menu.click();
      await page.evaluate(() => window.__editorNavigationFixture.setBusy(true));
      await page.getByRole("menu").waitFor({ state: "hidden" });
      assert.equal(await menu.isDisabled(), true, "A busy transition closes and disables an open step menu");
      await page.evaluate(() => window.__editorNavigationFixture.setBusy(false));
      await until(() => menu.isEnabled(), "Navigation becomes available when the busy operation ends");
      assert.equal(await menu.getAttribute("aria-expanded"), "false", "Ending a busy operation does not reopen the previous menu");
      if (!options.embedded) {
        await menu.click();
        await page.setViewportSize({ width: 1680, height: viewport.height });
        await page.getByRole("menu").waitFor({ state: "hidden" });
        await until(() => navigator(page).locator('button[aria-haspopup="menu"]').count().then((count) => count === 0), "A wide editor replaces the menu with direct step controls");
        await page.setViewportSize(viewport);
        await menu.waitFor();
        assert.equal(await menu.getAttribute("aria-expanded"), "false", "Returning to a narrow layout keeps the previous menu closed");
      }
    } else {
      const filters = navigator(page).getByRole("button", { name: /^Filters/ });
      await filters.focus(); await page.keyboard.press("Enter");
      await assertLanding(page, "Filters", "filters");
      await assertCurrent(page, "Filters");
      const analysis = navigator(page).getByRole("button", { name: /^Analysis/ });
      await analysis.focus(); await page.keyboard.press("Space");
      await assertLanding(page, "Analysis", "analysis");
      await assertCurrent(page, "Analysis");
    }
    await page.getByRole("button", { name: "Toggle visualization prerequisite", exact: true }).click();
    await chooseStep(page, "Visualization", "visualization");
    await page.getByRole("textbox", { name: "Visualization retained choice", exact: true }).waitFor();
    assert.equal((await selectionSnapshot(page)).selections.filters, "A choice retained while navigating", "Navigation preserves previously edited controls");
    await assertNoOverflow(page);
    if (process.env.OPENLAP_NAVIGATION_SCREENSHOT_DIR) {
      const directory = process.env.OPENLAP_NAVIGATION_SCREENSHOT_DIR;
      await fs.mkdir(directory, { recursive: true });
      await pause(850);
      const name = `${viewport.width}x${viewport.height}${options.embedded ? "-embedded" : ""}${options.reducedMotion === "no-preference" ? "-motion" : ""}`;
      await page.screenshot({ path: path.join(directory, `${name}.png`) });
      if (await menu.count()) {
        await menu.click();
        await assertNoOverflow(page);
        await pause(300);
        await page.screenshot({ path: path.join(directory, `${name}-menu.png`) });
        await page.keyboard.press("Escape");
      }
    }
    assert.deepEqual(f.errors, [], "No browser errors or external/API traffic");
    console.log(`PASS editor navigation ${viewport.width}×${viewport.height}${options.embedded ? " embedded" : ""}${options.reducedMotion === "no-preference" ? " normal motion" : " reduced motion"}: open/focus/scroll, prerequisites, passive orientation, selection preservation and containment`);
  } catch (failure) {
    console.error("Navigation fixture diagnostics:", f.errors, (await f.page.locator("body").innerText().catch(() => "Page unavailable")).slice(0, 2500));
    console.error("Navigation event/state diagnostics:", await f.page.evaluate(() => ({ state: window.__editorNavigationFixture.snapshot(), events: window.__navigationEvents, active: document.activeElement.outerHTML.slice(0, 500), scrollY })).catch(() => "Page unavailable"));
    throw failure;
  } finally { await f.context.close(); }
}

(async () => {
  const browser = await webkit.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) });
  try {
    const only = process.env.OPENLAP_NAVIGATION_ONLY;
    if (!only || only === "short") await coldShortEditor(browser);
    for (const [name, viewport, options] of [
      ["desktop", { width: 1680, height: 1000 }],
      ["motion", { width: 1680, height: 600 }, { reducedMotion: "no-preference" }],
      ["mobile", { width: 390, height: 844 }],
      ["tablet", { width: 1024, height: 768 }],
      ["embedded", { width: 1680, height: 1000 }, { embedded: true }],
      ["short", { width: 1680, height: 320 }],
    ]) if (!only || only === name) await scenario(browser, viewport, options);
  } finally { await browser.close(); }
})().catch((failure) => { console.error(failure); process.exitCode = 1; });
