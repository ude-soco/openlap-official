// Run against Vite. This fixture imports the real component/theme/workflow
// wrappers with synthetic fields; it never contacts accounts, APIs or storage.
const { webkit } = require("playwright");
const assert = require("node:assert/strict");
const base = new URL(process.env.OPENLAP_TEST_BASE_URL || "http://127.0.0.1:15281");
assert.equal(base.protocol, "http:");
assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(base.hostname));
assert.equal(base.username + base.password + base.search + base.hash, "");
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(check, description) {
  const deadline = Date.now() + 10000;
  while (!await check()) { assert.ok(Date.now() < deadline, description); await pause(30); }
}
const near = (actual, expected, message) => assert.ok(Math.abs(actual - expected) <= 2, `${message}: ${actual} versus ${expected}`);

async function fixture(browser, viewport, embedded = false) {
  const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
  const failures = [];
  await context.routeWebSocket(/.*/, (socket) => socket.close());
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== base.origin || url.pathname.startsWith("/api/")) {
      failures.push(`Unexpected fixture traffic: ${route.request().method()} ${url.origin}${url.pathname}`);
      return route.abort();
    }
    return route.continue();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on("pageerror", (error) => failures.push(error.message));
  await page.goto(new URL(`scripts/fixtures/community-reference-scroll.html${embedded ? "?embedded=1" : ""}`, base).href);
  await page.getByRole("textbox", { name: "Filters selection 1", exact: true }).waitFor();
  const fontFaces = await page.evaluate(async () => { const loaded = await document.fonts.load("14px Inter"); await document.fonts.ready; return loaded.length; });
  assert.ok(fontFaces > 0, "Actual Inter font must load for representative geometry");
  return { context, page, failures };
}

async function reference(page, label) {
  const section = page.getByRole("region", { name: `${label} fixture step`, exact: true });
  const summary = section.getByRole("button", { name: /^Community reference/ });
  await summary.waitFor();
  const controls = await summary.getAttribute("aria-controls");
  assert.equal(await page.locator(`[id="${controls}"]`).count(), 1, "Reference accordion controls one uniquely identified region");
  // Wait on THIS step's ancestors. The inner accordion can be entered while
  // the outer workflow Collapse is still overflow:hidden during its animation.
  await until(() => summary.evaluate((element) => {
    for (let node = element.closest(".MuiAccordion-root").parentElement.parentElement; node; node = node.parentElement) {
      if (node.classList.contains("MuiCollapse-root") && getComputedStyle(node).overflowY === "hidden") return false;
    }
    return true;
  }), `${label} workflow opening animation finishes`);
  return { section, summary };
}

async function geometry(summary) {
  return summary.evaluate((element) => {
    const paper = element.closest(".MuiAccordion-root").parentElement;
    const grid = paper.parentElement, details = paper.querySelector("[data-community-reference-body]");
    const rect = (node) => { const r = node.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height }; };
    return { paper: rect(paper), grid: rect(grid), summary: rect(element), details: rect(details),
      header: rect(document.querySelector(".MuiAppBar-root")), position: getComputedStyle(paper).position,
      bodyOverflowY: getComputedStyle(details).overflowY, bodyScrollHeight: details.scrollHeight,
      bodyClientHeight: details.clientHeight, scrollY, viewportHeight: innerHeight };
  });
}

async function noOverflow(page) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, "No horizontal viewport overflow");
  assert.equal(await page.getByRole("region", { name: /fixture step$/ }).evaluateAll((sections) => sections.every((section) => section.scrollWidth <= section.clientWidth + 1)), true,
    "No horizontal overflow inside workflow steps");
}

async function desktop(browser, height) {
  const f = await fixture(browser, { width: 1680, height });
  try {
    for (const label of ["Filters", "Analysis", "Visualization"]) {
      const { section, summary } = await reference(f.page, label);
      await until(async () => (await summary.getAttribute("aria-expanded")) === "true", `${label} wide reference starts expanded`);
      let g = await geometry(summary);
      assert.equal(g.position, "sticky", `${label} wide reference is sticky`);
      const start = g.grid.top + g.scrollY;
      const expectedTop = g.header.bottom + 16;
      await f.page.evaluate((target) => window.scrollTo(0, target), start + 180);
      await until(async () => Math.abs((await geometry(summary)).paper.top - expectedTop) < 2, `${label} sticks below the app header`);
      g = await geometry(summary);
      assert.ok(g.paper.top > g.header.bottom + 8, "Sticky reference clears fixed header");
      assert.ok(g.paper.bottom <= height - 8, "Reference fits the available viewport height");
      assert.ok(g.bodyScrollHeight > g.bodyClientHeight + 20, "Long reference body is internally scrollable");
      assert.ok(["auto", "scroll"].includes(g.bodyOverflowY), "Only the reference body owns vertical overflow");
      const pageScroll = g.scrollY;
      await summary.evaluate((element) => { const body = element.closest("[data-community-reference]").querySelector("[data-community-reference-body]"); body.scrollTop = body.scrollHeight; });
      const scrolled = await summary.evaluate((element) => {
        const body = element.closest("[data-community-reference]").querySelector("[data-community-reference-body]");
        return { scrollTop: body.scrollTop, scrollHeight: body.scrollHeight, clientHeight: body.clientHeight, scrollY };
      });
      assert.ok(scrolled.scrollTop > 20 && scrolled.scrollTop + scrolled.clientHeight >= scrolled.scrollHeight - 2, "Last reference row is reachable");
      near(scrolled.scrollY, pageScroll, "Reference scrolling leaves the page stationary");
      g = await geometry(summary);
      assert.ok(g.summary.top >= g.header.bottom && g.summary.bottom < height, "Reference heading remains visible while body scrolls");
      const end = g.grid.bottom + g.scrollY;
      await f.page.evaluate((target) => window.scrollTo(0, target), end - 160);
      await until(async () => (await geometry(summary)).paper.top < 70, `${label} reference releases at its own step boundary`);
      g = await geometry(summary);
      assert.ok(g.paper.bottom <= g.grid.bottom + 2, "Reference never extends past its comparison step");
      const last = section.getByRole("textbox", { name: `${label} final selection`, exact: true });
      await last.scrollIntoViewIfNeeded();
      assert.equal(await last.evaluate((element) => { const r = element.getBoundingClientRect(); return element.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)); }), true,
        "Editing controls remain unobscured by the reference");
      await noOverflow(f.page);
    }
    assert.deepEqual(f.failures, []);
    console.log(`PASS reference sticky/header/viewport/body-scroll/step-boundary geometry at1680×${height}`);
  } finally { await f.context.close(); }
}

async function narrow(browser, viewport, embedded = false) {
  const f = await fixture(browser, viewport, embedded);
  try {
    for (const label of ["Filters", "Analysis", "Visualization"]) {
      const { section, summary } = await reference(f.page, label);
      await until(async () => (await summary.getAttribute("aria-expanded")) === "false", `${label} narrow reference defaults collapsed`);
      assert.equal((await geometry(summary)).position, "static", "Narrow/embedded reference remains in document flow");
      await summary.focus(); await summary.press("Enter");
      await until(async () => (await summary.getAttribute("aria-expanded")) === "true", "Reference opens by keyboard");
      await summary.press("Enter");
      await until(async () => (await summary.getAttribute("aria-expanded")) === "false", "Reference closes by keyboard");
      const field = section.getByRole("textbox", { name: `${label} final selection`, exact: true });
      await field.scrollIntoViewIfNeeded();
      assert.equal(await field.isVisible(), true, "Editing controls remain reachable");
      await noOverflow(f.page);
    }
    assert.deepEqual(f.failures, []);
    console.log(`PASS normal-flow collapsible references at${viewport.width}×${viewport.height}${embedded ? " in a narrow embedded source" : ""}`);
  } finally { await f.context.close(); }
}

async function veryShort(browser) {
  const f = await fixture(browser, { width: 1680, height: 320 });
  try {
    const { summary, section } = await reference(f.page, "Filters");
    assert.equal((await geometry(summary)).position, "static", "Very short desktop viewport uses normal flow");
    assert.equal((await geometry(summary)).bodyOverflowY, "visible", "Very short viewport avoids a cramped nested scroller");
    await summary.focus(); await summary.press("Enter");
    await until(async () => (await summary.getAttribute("aria-expanded")) === "false", "Reference can collapse to recover editing space");
    await section.getByRole("textbox", { name: "Filters final selection", exact: true }).scrollIntoViewIfNeeded();
    await noOverflow(f.page);
    assert.deepEqual(f.failures, []);
    console.log("PASS very short1680×320 viewport uses collapsible normal-flow reference");
  } finally { await f.context.close(); }
}

(async () => {
  const browser = await webkit.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) });
  try {
    await desktop(browser, 1000);
    await desktop(browser, 600);
    await narrow(browser, { width: 390, height: 844 });
    await narrow(browser, { width: 1024, height: 768 });
    await narrow(browser, { width: 1680, height: 1000 }, true);
    await veryShort(browser);
  } finally { await browser.close(); }
})().catch((failure) => { console.error(failure); process.exitCode = 1; });
