// Real application, synthetic owner-bound APIs. No deployed service, actual
// account, database or external chart runtime is contacted.
const { webkit } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const base = new URL(process.env.OPENLAP_TEST_BASE_URL || "http://127.0.0.1:5204");
assert.equal(base.protocol, "http:"); assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(base.hostname));
assert.equal(base.username + base.password + base.search + base.hash, "");
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(check, label) { const end = Date.now() + 12000; while (!await check()) { assert.ok(Date.now() < end, label); await wait(25); } }
(async () => {
  const { emptyBasicState, serializeBasicDraft } = await import("../src/pages/indicators/indicator-editor/basic-indicator/utils/basic-draft-model.js");
  const { newComplexConfiguration } = await import("../src/pages/indicators/indicator-editor/complex-indicator/complex-model.js");
  const state = emptyBasicState(new Date("2026-11-15T12:00:00Z"));
  for (const item of Object.values(state.lockedStep)) { item.locked = false; item.openPanel = true; }
  const reference = { name: "Community material accesses", type: "BASIC", dataset: { sourceCount: 1, outputs: [{ id: "activities", name: "Activities", type: "Text" }] },
    filters: { activityTypes: [{ id: "pdf", name: "PDF" }], actions: [{ id: "accessed", name: "Accessed" }], activities: [{ id: "public-material", name: "Material" }], scope: "ONLY_ME", timeframe: { from: "2026-01-01", until: "2026-11-01" } },
    analysis: { method: { id: "count", name: "Count items", available: false }, params: [{ id: "limit", name: "Number of items", value: 10 }], mapping: { mapping: [] } },
    visualization: { library: { id: "c3", name: "C3", available: false }, chart: { id: "bar", name: "Bar Chart", available: false }, mapping: { mapping: [] }, params: { height: 500 } } };
  let draft = { id: "adaptation-draft", name: "My adapted indicator", indicatorType: "BASIC", schemaVersion: 1, revision: 0, status: "DRAFT", recoverable: true,
    configuration: serializeBasicDraft(state), adaptation: { schemaVersion: 1, poolId: "community-basic", sourceVersion: "v1", reference }, sourceIndicatorId: null };
  const drafts = new Map([[draft.id, draft]]);
  const calls = [], errors = [];
  let stage = "starting browser";
  let connected = false;
  let actionFilterFixture = false, holdActivities = false;
  const heldActivities = [];
  let holdActivityTypes = false;
  const heldActivityTypes = [];
  const actionOptions = ["clicked", "accessed", "annotated"].map((id) => ({ id, name: id[0].toUpperCase() + id.slice(1) }));
  const activityFor = (action) => ({ id: `${action}-material`, queryId: "statement.object.id", name: `${action[0].toUpperCase() + action.slice(1)} material` });
  const longLrs = { id: "own", lrsId: "own", uniqueIdentifier: "viewer", lrsTitle: "A connected learning record store with a long descriptive title" };
  const token = "e30." + Buffer.from(JSON.stringify({ sub: "adaptation.viewer@example.test", roles: ["ROLE_USER_WITHOUT_LRS"], exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url") + ".fixture";
  console.log("Launching local synthetic WebKit fixture…");
  const browser = await webkit.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) });
  console.log("WebKit connected; preparing fixture…");
  const contexts = [];
  const routeRequest = async (route) => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== base.origin) { errors.push(`Off-origin request ${url.origin}`); return route.abort(); }
    if (!url.pathname.startsWith("/api/")) return route.continue();
    const path = url.pathname.slice(5), method = request.method(), body = request.postData() ? request.postDataJSON() : null;
    calls.push({ path, method, body });
    const send = (data, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify({ data }) });
    if (path === "v1/users/my") return send({ name: "Adaptation viewer", roles: ["ROLE_USER_WITHOUT_LRS"] });
    if (path === "v1/community/indicators/filters") return send({ types: ["BASIC"], methods: ["Count items"], charts: ["Bar Chart"] });
    if (path === "v1/community/indicators") return send({ content: [{ id: "community-basic", name: reference.name, type: "BASIC", method: "Count items", chart: "Bar Chart" }], totalElements: 1 });
    if (path === "v1/community/indicators/community-basic") return send({ id: "community-basic", name: reference.name, type: "BASIC", version: "v1", method: "Count items" });
    if (path.endsWith("/preview")) return send({ status: "NO_CONNECTION" });
    if (path === "v1/community/indicators/community-basic/adaptations") { assert.match(body.clientRequestId, /^[0-9a-f-]{36}$/); return send(draft); }
    const draftMatch = path.match(/^v1\/indicators\/drafts\/([^/]+)$/);
    if (draftMatch) {
      const id = draftMatch[1], stored = drafts.get(id);
      assert.ok(stored, "Only a fixture-owned draft can be requested");
      if (method === "PUT") {
        assert.equal(body.revision, stored.revision);
        const acknowledged = { ...stored, ...body, revision: stored.revision + 1 };
        drafts.set(id, acknowledged);
        if (id === draft.id) draft = acknowledged;
      }
      return send(drafts.get(id));
    }
    if (path === "v1/analytics/methods/outputs/count") return send([]);
    if (path === "v1/users/my/lrs") return send(connected ? [longLrs] : []);
    if (actionFilterFixture && path === "v1/statements/activity-types") {
      const reply = () => send([{ id: "material", name: "Material" }, { id: "pdf", name: "PDF" }]);
      if (holdActivityTypes) { heldActivityTypes.push(reply); return; }
      return reply();
    }
    if (actionFilterFixture && path === "v1/statements/actions") return send(actionOptions);
    if (actionFilterFixture && path === "v1/statements/activities") {
      assert.equal(body.actionOnActivities.length, 1, "Activity lookup uses exactly the current action");
      const action = body.actionOnActivities[0];
      if (holdActivities) {
        heldActivities.push({ action, respond: () => send([activityFor(action)]), fail: () => send({}, 500) });
        return;
      }
      return send([activityFor(action)]);
    }
    if (["v1/statements/activity-types", "v1/analytics/methods", "v1/visualizations/libraries"].includes(path)) return send([]);
    errors.push(`Unexpected API ${method} ${path}`); return send({}, 500);
  };
  const createContext = async (viewport) => {
    const context = await browser.newContext({ viewport });
    contexts.push(context);
    await context.routeWebSocket(/.*/, (socket) => socket.close());
    await context.addInitScript((token) => localStorage.setItem("authTokens", JSON.stringify({ access_token: token, refresh_token: token })), token);
    await context.route("**/*", routeRequest);
    context.on("page", (opened) => {
      opened.setDefaultTimeout(12000);
      opened.on("pageerror", (error) => errors.push(error.message));
      opened.on("crash", () => errors.push(`Browser page crashed at ${opened.url()}`));
    });
    return context;
  };
  const desktop = { width: 1680, height: 1000 }, mobile = { width: 390, height: 844 };
  let page = await (await createContext(desktop)).newPage();
  try {
    stage = "opening community pool"; console.log("Opening local Indicator Pool…");
    await page.goto(new URL("indicator/pool", base).href);
    await page.getByRole("button", { name: `View ${reference.name}`, exact: true }).click();
    await page.getByText("Connect your LRS in Manage LRS before previewing this indicator.", { exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Adapt to my data", exact: true }).isEnabled(), true, "Incompatibility/no LRS never blocks creating an adaptation");
    stage = "starting private adaptation";
    await page.getByRole("button", { name: "Adapt to my data", exact: true }).dblclick();
    await page.waitForURL("**/indicator/editor/drafts/adaptation-draft");
    await page.getByRole("heading", { name: "Adapt a Basic Indicator", exact: true }).waitFor();
    await until(() => page.getByRole("heading", { name: "Community reference", exact: true }).count().then((count) => count === 4), "Every opened Basic section has its own contextual reference");
    assert.equal(calls.filter((call) => call.path.endsWith("/adaptations")).length, 1, "Double activation creates one request");
    assert.equal(await page.getByRole("radio", { name: "Use data of all users", exact: true }).isEnabled(), true);
    assert.equal(await page.getByRole("radio", { name: "Use all except my data", exact: true }).isEnabled(), true);
    assert.equal(await page.getByRole("radio", { name: "Use only my data", exact: true }).isChecked(), true);
    const scopeReference = () => page.locator('[data-community-reference="filters"]').getByText("Community data scope", { exact: true }).locator("..");
    assert.equal(await scopeReference().getByText("Same as community", { exact: true }).count(), 1, "The scope reference compares the current choice");
    assert.equal(await page.getByText("Accessed", { exact: true }).count() > 0, true, "Unavailable original remains in the reference");
    assert.equal(await page.getByRole("button", { name: "Manage LRS", exact: true }).count(), 1);
    const noOverflow = async () => {
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, "No horizontal editor overflow");
      assert.equal(await page.locator("section").evaluateAll((sections) => sections.filter((section) => section.scrollWidth > section.clientWidth + 1).length), 0, "No horizontal scrolling inside workflow sections");
    };
    await noOverflow();
    if (process.env.OPENLAP_ADAPTATION_SCREENSHOT_DIR) { await fs.mkdir(process.env.OPENLAP_ADAPTATION_SCREENSHOT_DIR, { recursive: true });
      await page.screenshot({ path: path.join(process.env.OPENLAP_ADAPTATION_SCREENSHOT_DIR, "basic-adaptation-desktop.png"), fullPage: true }); }
    stage = "autosaving and reloading Basic adaptation";
    const name = page.getByRole("textbox", { name: "Indicator name", exact: true });
    await name.fill("My adapted indicator after reload");
    await until(() => draft.name === "My adapted indicator after reload" && calls.some((call) =>
      call.method === "PUT" && call.body?.name === "My adapted indicator after reload"), "The exact renamed value reaches the server");
    await page.getByText("Draft saved", { exact: true }).waitFor();
    await page.reload(); await page.getByRole("heading", { name: "Adapt a Basic Indicator", exact: true }).waitFor();
    await until(() => page.getByRole("heading", { name: "Community reference", exact: true }).count().then((count) => count === 4), "Frozen reference survives reload");
    stage = "selecting and reloading adaptation user scopes";
    for (const [label, scope] of [["Use data of all users", "INCLUDE_ME"], ["Use all except my data", "EXCLUDE_ME"]]) {
      await page.getByRole("radio", { name: label, exact: true }).click();
      await until(() => Promise.resolve(draft.configuration.filters.selectedUserFilter === scope), "The selected user scope autosaves");
      await page.getByText("Draft saved", { exact: true }).waitFor();
      assert.equal(await scopeReference().getByText("Changed", { exact: true }).count(), 1, "Reference feedback reflects a different scope");
      // Cold hydration in a new device context also avoids WebKit retaining
      // several long editor documents across successive page.reload calls.
      await page.context().close();
      page = await (await createContext(desktop)).newPage();
      await page.goto(new URL(`indicator/editor/drafts/${draft.id}`, base).href);
      await page.getByRole("heading", { name: "Adapt a Basic Indicator", exact: true }).waitFor();
      await until(() => page.getByRole("radio", { name: label, exact: true }).isChecked(), "Reload preserves the chosen scope instead of forcing only-my-data");
    }
    stage = "checking narrow Basic adaptation";
    // Separate device contexts keep storage/rendering isolated while sharing
    // this account's authoritative server drafts. Each starts at its viewport.
    page = await (await createContext(mobile)).newPage();
    await page.goto(new URL(`indicator/editor/drafts/${draft.id}`, base).href);
    await page.getByRole("heading", { name: "Adapt a Basic Indicator", exact: true }).waitFor();
    await until(() => page.getByRole("button", { name: /^Community reference/ }).evaluateAll((buttons) =>
      buttons.length === 4 && buttons.every((button) => button.getAttribute("aria-expanded") === "false")), "References start collapsed in the narrow layout");
    await noOverflow(); await page.getByText("Draft saved", { exact: true }).waitFor();
    connected = true;
    const connectedDraft = { ...draft, id: "adaptation-connected", revision: 0,
      configuration: { ...draft.configuration, dataset: { selectedLRSList: [longLrs] } } };
    drafts.set(connectedDraft.id, connectedDraft);
    await page.goto(new URL(`indicator/editor/drafts/${connectedDraft.id}`, base).href);
    await page.getByRole("heading", { name: "Adapt a Basic Indicator", exact: true }).waitFor();
    await page.getByText(longLrs.lrsTitle, { exact: true }).waitFor(); await noOverflow();
    if (process.env.OPENLAP_ADAPTATION_SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.OPENLAP_ADAPTATION_SCREENSHOT_DIR, "basic-adaptation-mobile.png"), fullPage: true });
    stage = "replacing actions and rejecting stale activity lookups";
    // An actual saved Basic editor with two filter rows catches the distinction
    // between the filter-row index and its one selected action. All writes below
    // remain intercepted by this in-memory draft service.
    await page.getByText("Draft saved", { exact: true }).waitFor();
    actionFilterFixture = true;
    const filterState = emptyBasicState();
    for (const item of Object.values(filterState.lockedStep)) { item.locked = false; item.openPanel = true; }
    filterState.dataset.selectedLRSList = [longLrs];
    filterState.filters.selectedActivities = ["clicked", "accessed"].map((action, index) => ({
      id: `filter-${index + 1}`, selectedActivityType: { id: "material", name: "Material" },
      selectedActionList: [actionOptions.find((option) => option.id === action)], selectedActivityList: [activityFor(action)],
    }));
    const filtersDraft = { ...draft, id: "adaptation-action-filters", revision: 0, configuration: serializeBasicDraft(filterState) };
    drafts.set(filtersDraft.id, filtersDraft);
    page = await (await createContext(desktop)).newPage();
    await page.goto(new URL(`indicator/editor/drafts/${filtersDraft.id}`, base).href);
    const actions = page.getByRole("combobox", { name: "Action", exact: true });
    await until(async () => await actions.count() === 2 && await actions.nth(0).inputValue() === "Clicked" && await actions.nth(1).inputValue() === "Accessed",
      "Every filter row renders its own selected action regardless of row index");
    await page.getByText("Draft saved", { exact: true }).waitFor();
    const rowOne = actions.nth(0).locator("xpath=ancestor::div[contains(@class,'MuiPaper-root')][1]");
    const selectAction = async (label) => {
      await actions.nth(0).scrollIntoViewIfNeeded();
      await actions.nth(0).click();
      await page.getByRole("option").filter({ hasText: new RegExp(`^${label}`) }).click();
    };
    await actions.nth(0).fill("Opened");
    await page.getByText("No matching actions in your selected data.", { exact: true }).waitFor();
    assert.equal(await page.getByRole("option").count(), 0, "Unadvertised actions cannot be selected by typing their label");
    await page.keyboard.press("Escape"); await actions.nth(0).blur();
    await until(() => actions.nth(0).inputValue().then((value) => value === "Clicked"), "Unavailable search leaves the selected action unchanged");
    assert.deepEqual(drafts.get(filtersDraft.id).configuration.filters.selectedActivities[0].selectedActionList, [actionOptions[0]],
      "An unavailable search does not change the persisted selection");
    holdActivities = true;
    await selectAction("Accessed");
    await until(() => Promise.resolve(heldActivities.length === 1), "Replacement requests new action's activities");
    assert.equal(await actions.nth(0).inputValue(), "Accessed", "Selection changes before activity lookup finishes");
    assert.equal(await rowOne.getByRole("combobox", { name: "Activities", exact: true }).isEnabled(), false,
      "Dependent activities are cleared while the new action is loading");
    assert.equal(await rowOne.getByText("Clicked material", { exact: true }).count(), 0, "Old selected activities clear immediately");
    await until(() => Promise.resolve(drafts.get(filtersDraft.id).configuration.filters.selectedActivities[0].selectedActionList.some((entry) => entry.id === "accessed")),
      "The replacement action autosaves while its activity lookup is pending");
    assert.deepEqual(drafts.get(filtersDraft.id).configuration.filters.selectedActivities[0].selectedActionList, [actionOptions[1]],
      "Replacing an action replaces the previous value rather than appending it");
    await selectAction("Clicked");
    await until(() => Promise.resolve(heldActivities.length === 2), "Second lookup can supersede the pending first lookup");
    await selectAction("Annotated");
    await until(() => Promise.resolve(heldActivities.length === 3), "Third lookup can supersede both older lookups");
    const newest = page.waitForResponse((response) => response.url().endsWith("/v1/statements/activities") && response.request().postDataJSON().actionOnActivities[0] === "annotated");
    await heldActivities[2].respond(); await newest;
    await until(() => rowOne.getByRole("combobox", { name: "Activities", exact: true }).isEnabled(), "Newest result enables dependent activities");
    // Resolve the oldest response last, matching a slow network rather than
    // assuming requests always complete in selection order.
    for (const index of [1, 0]) {
      const response = page.waitForResponse((entry) => entry.url().endsWith("/v1/statements/activities") && entry.request().postDataJSON().actionOnActivities[0] === heldActivities[index].action);
      await heldActivities[index].respond(); await response;
    }
    await until(() => Promise.resolve(drafts.get(filtersDraft.id).configuration.filters.selectedActivities[0].selectedActionList[0]?.id === "annotated"),
      "Autosave persists the replacement action");
    await page.getByText("Draft saved", { exact: true }).waitFor();
    assert.equal(await actions.nth(0).inputValue(), "Annotated", "Stale activity results never revert the current action");
    assert.equal(await actions.nth(1).inputValue(), "Accessed", "Replacing one row leaves another row's action unchanged");
    await rowOne.getByRole("combobox", { name: "Activities", exact: true }).click();
    assert.equal(await page.getByRole("option", { name: "Annotated material", exact: true }).count(), 1, "Newest action owns available activities");
    assert.equal(await page.getByRole("option", { name: /^(Clicked|Accessed) material$/ }).count(), 0, "Stale activity catalogs do not replace the newest catalog");
    await page.keyboard.press("Escape");
    const savedFilters = drafts.get(filtersDraft.id).configuration.filters.selectedActivities;
    assert.deepEqual(savedFilters[0].selectedActionList, [actionOptions[2]], "Only one action is persisted per filter");
    assert.deepEqual(savedFilters[0].selectedActivityList, [], "Previous activities remain cleared until the user chooses new ones");
    assert.deepEqual(savedFilters[1].selectedActionList, [actionOptions[1]], "Other rows retain their action and activities");
    assert.deepEqual(savedFilters[1].selectedActivityList, [activityFor("accessed")]);
    await selectAction("Clicked");
    await until(() => Promise.resolve(heldActivities.length === 4), "Failure fixture receives the newly selected action");
    const failed = page.waitForResponse((entry) => entry.url().endsWith("/v1/statements/activities") && entry.status() === 500);
    await heldActivities[3].fail(); await failed;
    await rowOne.getByText("Could not load activities. Try again.", { exact: true }).waitFor();
    assert.equal(await actions.nth(0).inputValue(), "Clicked", "A lookup failure preserves the user's chosen action");
    assert.equal(await rowOne.getByRole("combobox", { name: "Activities", exact: true }).isEnabled(), false, "Failed lookup leaves no stale activities");
    await rowOne.getByRole("button", { name: "Retry", exact: true }).click();
    await until(() => Promise.resolve(heldActivities.length === 5), "Retry requests the current action's activities");
    assert.equal(heldActivities[4].action, "clicked");
    await heldActivities[4].respond();
    await until(() => rowOne.getByRole("combobox", { name: "Activities", exact: true }).isEnabled(), "Retry restores dependent activity choices");
    assert.equal(await rowOne.getByText("Could not load activities. Try again.", { exact: true }).count(), 0);
    await selectAction("Accessed");
    await until(() => Promise.resolve(heldActivities.length === 6), "Pending action lookup exists before changing the activity type");
    const activityType = rowOne.getByRole("combobox", { name: "Activity type", exact: true });
    await activityType.click();
    await page.getByRole("option").filter({ hasText: /^PDF/ }).click();
    await until(() => activityType.inputValue().then((value) => value === "PDF"), "Type replacement is immediate");
    const staleType = page.waitForResponse((entry) => entry.url().endsWith("/v1/statements/activities") && entry.request().postDataJSON().actionOnActivities[0] === "accessed");
    await heldActivities[5].respond(); await staleType;
    await until(() => Promise.resolve(drafts.get(filtersDraft.id).configuration.filters.selectedActivities[0].selectedActivityType.id === "pdf"), "Autosave persists replacement activity type");
    await page.getByText("Draft saved", { exact: true }).waitFor();
    assert.equal(await actions.nth(0).inputValue(), "", "Changing activity type clears the action despite its stale response");
    assert.equal(await rowOne.getByRole("combobox", { name: "Activities", exact: true }).isEnabled(), false, "Old action result cannot populate activities for a new type");
    assert.deepEqual(drafts.get(filtersDraft.id).configuration.filters.selectedActivities[0].selectedActionList, []);
    assert.equal(await actions.nth(1).inputValue(), "Accessed", "Type changes preserve other filter rows");
    holdActivities = false;
    await noOverflow();
    console.log("Action selection passed: immediate replacement, dependent reset, independent rows, out-of-order lookups, retry and type-change protection.");
    stage = "preserving a scope chosen during an LRS catalog refresh";
    const lrsState = emptyBasicState();
    for (const item of Object.values(lrsState.lockedStep)) { item.locked = false; item.openPanel = true; }
    const lrsDraft = { ...draft, id: "adaptation-pending-lrs", revision: 0, configuration: serializeBasicDraft(lrsState) };
    drafts.set(lrsDraft.id, lrsDraft);
    await page.context().close();
    page = await (await createContext(desktop)).newPage();
    await page.goto(new URL(`indicator/editor/drafts/${lrsDraft.id}`, base).href);
    const lrsInput = page.getByPlaceholder("Search for Learning Record Stores (LRS)", { exact: true });
    await lrsInput.waitFor();
    holdActivityTypes = true;
    await lrsInput.click();
    await page.getByRole("option", { name: longLrs.lrsTitle, exact: true }).click();
    await until(() => Promise.resolve(heldActivityTypes.length === 1), "New LRS catalog lookup remains pending");
    await page.keyboard.press("Escape");
    await page.getByRole("radio", { name: "Use data of all users", exact: true }).click();
    await until(() => Promise.resolve(drafts.get(lrsDraft.id).configuration.filters.selectedUserFilter === "INCLUDE_ME"), "A scope chosen during the lookup autosaves");
    const refreshed = page.waitForResponse((response) => response.url().endsWith("/v1/statements/activity-types"));
    await heldActivityTypes[0](); await refreshed;
    holdActivityTypes = false;
    await page.getByRole("button", { name: "Add filter", exact: true }).click();
    await page.getByRole("combobox", { name: "Activity type", exact: true }).click();
    await page.getByRole("option").filter({ hasText: /^Material/ }).waitFor();
    await page.keyboard.press("Escape");
    assert.equal(await page.getByRole("radio", { name: "Use data of all users", exact: true }).isChecked(), true,
      "Completing the LRS refresh preserves a newer scope choice");
    await page.getByText("Draft saved", { exact: true }).waitFor();
    assert.equal(drafts.get(lrsDraft.id).configuration.filters.selectedUserFilter, "INCLUDE_ME", "Refresh cannot overwrite the persisted scope with its earlier snapshot");
    stage = "checking responsive complex source controls";
    const complex = newComplexConfiguration("COMPOSITE");
    complex.sources = ["source-one", "source-two"].map((id, index) => ({ id, name: `Source ${index + 1}`, outputs: [],
      analyticsMethod: { id: "count", name: "Count N most occurring or least occurring items" }, keyColumnId: "", measureColumnIds: [] }));
    complex.sourceDrafts = Object.fromEntries(complex.sources.map((source) => {
      const basic = emptyBasicState();
      for (const item of Object.values(basic.lockedStep)) { item.locked = false; item.openPanel = true; }
      return [source.id, serializeBasicDraft(basic)];
    }));
    await page.getByText("Draft saved", { exact: true }).waitFor();
    const compositeDraft = { ...draft, id: "adaptation-composite", revision: 0, indicatorType: "COMPOSITE", configuration: { ...complex, name: draft.name } };
    drafts.set(compositeDraft.id, compositeDraft);
    page = await (await createContext(mobile)).newPage();
    await page.goto(new URL(`indicator/editor/drafts/${compositeDraft.id}`, base).href);
    await page.getByRole("list", { name: "Source indicators to adapt", exact: true }).waitFor();
    assert.equal(await page.getByText("Needs your selections", { exact: true }).count(), 2, "Source status remains fully readable on mobile");
    assert.equal(await page.getByRole("button", { name: "Edit source", exact: true }).evaluateAll((buttons) => buttons.every((button) => button.clientWidth >= 80 && button.clientHeight <= 60)), true, "Mobile source actions fit on a readable line");
    await noOverflow();
    if (process.env.OPENLAP_ADAPTATION_SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.OPENLAP_ADAPTATION_SCREENSHOT_DIR, "complex-adaptation-sources-mobile.png"), fullPage: true });
    page = await (await createContext(desktop)).newPage();
    await page.goto(new URL(`indicator/editor/drafts/${compositeDraft.id}`, base).href);
    await page.getByRole("table", { name: "Source indicators to adapt", exact: true }).waitFor(); await noOverflow();
    stage = "selecting and reloading embedded complex source scopes";
    for (const type of ["COMPOSITE", "MULTI_LEVEL"]) {
      const id = `adaptation-scope-${type.toLowerCase()}`;
      const stored = { ...compositeDraft, id, revision: 0, indicatorType: type,
        configuration: { ...structuredClone(complex), type } };
      drafts.set(id, stored);
      await page.context().close();
      page = await (await createContext(desktop)).newPage();
      await page.goto(new URL(`indicator/editor/drafts/${id}`, base).href);
      await page.getByRole("table", { name: "Source indicators to adapt", exact: true }).waitFor();
      await page.getByRole("button", { name: "Edit source", exact: true }).first().click();
      await page.getByRole("heading", { name: "Edit source selections", exact: true }).waitFor();
      await until(() => page.getByRole("radio", { name: "Use only my data", exact: true }).isChecked(), "New complex source defaults to only-my-data");
      assert.equal(await page.getByRole("radio", { name: "Use all except my data", exact: true }).isEnabled(), true);
      assert.equal(await page.getByRole("radio", { name: "Use data of all users", exact: true }).isEnabled(), true);
      await page.getByRole("radio", { name: "Use data of all users", exact: true }).click();
      await page.getByRole("button", { name: "Back to sources", exact: true }).click();
      await until(() => Promise.resolve(drafts.get(id).configuration.sourceDrafts["source-one"].filters.selectedUserFilter === "INCLUDE_ME"),
        "Complex source scope autosaves in its parent draft");
      await page.getByText("Draft saved", { exact: true }).waitFor();
      assert.equal(drafts.get(id).configuration.sourceDrafts["source-two"].filters.selectedUserFilter, "ONLY_ME", "Source scopes stay independent");
      await page.context().close();
      page = await (await createContext(desktop)).newPage();
      await page.goto(new URL(`indicator/editor/drafts/${id}`, base).href);
      await page.getByRole("table", { name: "Source indicators to adapt", exact: true }).waitFor();
      await page.getByRole("button", { name: "Edit source", exact: true }).first().click();
      await page.getByRole("heading", { name: "Edit source selections", exact: true }).waitFor();
      await until(() => page.getByRole("radio", { name: "Use data of all users", exact: true }).isChecked(), "Embedded source hydration preserves its chosen scope");
      await noOverflow();
      await page.getByRole("button", { name: "Back to sources", exact: true }).click();
      await page.getByText("Draft saved", { exact: true }).waitFor();
    }
    assert.equal(calls.some((call) => /analyze|adaptation-preview|\/complete$/.test(call.path)), false, "Opening and autosaving a partial adaptation does not execute plugins");
    assert.deepEqual(errors, []);
    console.log("Community adaptation passed: incompatible/no-LRS entry, idempotent start, contextual reference, editable user scopes, independent complex source scopes, reload and responsive layout.");
  } catch (failure) {
    // A closed/crashed page must not replace the actual failed assertion with a
    // second diagnostic error. Print the original before best-effort details.
    console.error(`Community adaptation failed while ${stage}:`, failure);
    console.error("Fixture requests:", calls.map(({ path, method }) => ({ path, method })));
    console.error("Fixture errors:", errors);
    if (!page.isClosed()) {
      const body = await page.locator("body").innerText({ timeout: 2000 }).catch(() => "Page body unavailable");
      console.error("Fixture page:", page.url(), body);
    }
    throw failure;
  }
  finally {
    for (const context of contexts) await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
})().catch((failure) => { console.error(failure); process.exitCode = 1; });
