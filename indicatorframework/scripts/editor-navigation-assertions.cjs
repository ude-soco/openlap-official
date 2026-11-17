const assert = require("node:assert/strict");
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(check, description) {
  const deadline = Date.now() + 10000;
  while (!await check()) { assert.ok(Date.now() < deadline, description); await pause(30); }
}
const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const navigator = (page) => page.locator("[data-editor-navigation]").filter({ visible: true });
async function chooseStep(page, label, key) {
  const nav = navigator(page);
  assert.equal(await nav.count(), 1, "Only the current editor's navigator is visible");
  // aria-haspopup belongs to the button itself, rather than one of its children.
  const menuButton = nav.locator('button[aria-haspopup="menu"]');
  if (await menuButton.count()) {
    await menuButton.click();
    await page.getByRole("menuitem", { name: new RegExp(`^${escape(label)}(?:\\b|,)`) }).click();
  } else {
    await nav.getByRole("button", { name: new RegExp(`^${escape(label)}(?:\\b|,)`) }).click();
  }
  return assertLanding(page, label, key);
}
async function assertLanding(page, label, key) {
  const section = page.locator(`[data-editor-step="${key}"]`).filter({ visible: true });
  await until(() => section.evaluate((element) => element === document.activeElement || element.contains(document.activeElement)), `${label} receives focus after navigation`);
  await until(async () => {
    const bounds = await section.evaluate((element) => {
      const workflow = element.closest("[data-editor-workflow]");
      const nav = workflow.querySelector("[data-editor-navigation]");
      return { top: element.getBoundingClientRect().top, navBottom: nav.getBoundingClientRect().bottom };
    });
    return bounds.top >= bounds.navBottom - 2 && bounds.top < bounds.navBottom + 80;
  }, `${label} heading lands below the sticky navigator`);
  return section;
}
async function assertCurrent(page, label) {
  await until(async () => {
    const current = navigator(page).locator('[aria-current="step"]');
    return await current.count() === 1 && new RegExp(escape(label), "i").test(await current.innerText());
  }, `${label} is the viewed step`);
}
async function scrollToStep(page, key) {
  await page.mouse.wheel(0, 1);
  await page.locator(`[data-editor-step="${key}"]`).filter({ visible: true }).evaluate((element) => {
    const nav = element.closest("[data-editor-workflow]").querySelector("[data-editor-navigation]");
    const header = document.querySelector("[data-app-header]") || document.querySelector(".MuiAppBar-root");
    const offset = (header?.getBoundingClientRect().bottom || 0) + nav.getBoundingClientRect().height + 16;
    window.scrollTo({ top: scrollY + element.getBoundingClientRect().top - offset + 4, behavior: "instant" });
  });
}
async function assertNoOverflow(page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "No horizontal viewport overflow");
  assert.ok(await page.locator("[data-editor-workflow], [data-editor-step], [data-editor-navigation]").evaluateAll((elements) => elements.every((element) => element.scrollWidth <= element.clientWidth + 1)), "Editor, step and navigation containers do not scroll horizontally");
}
module.exports = { navigator, chooseStep, assertLanding, scrollToStep, assertCurrent, assertNoOverflow, until };
