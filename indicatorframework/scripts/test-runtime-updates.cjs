// Requires externally installed Playwright; no application server or account:
// NODE_PATH=/path/to/playwright/node_modules node scripts/test-runtime-updates.cjs
// Runs its own Vite development/production fixtures on loopback ports 15287/15288.
// Every API response is intercepted locally; all off-origin traffic is blocked.
const { webkit } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const appRoot = path.resolve(__dirname, "..");
const fixtureName = `.runtime-updates-${process.pid}.jsx`;
const fixturePath = path.join(__dirname, fixtureName);
const htmlName = `runtime-updates-${process.pid}.html`;
const htmlPath = path.join(appRoot, htmlName);
const apiPrefix = "/__runtime_api__/";
const password = "local & synthetic=password";
const jwt = (roles, generation) => [
  Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url"),
  Buffer.from(JSON.stringify({ sub: "local-fixture", roles, generation, exp: 4102444800 })).toString("base64url"),
  "synthetic-signature",
].join(".");
const tokensFor = (role, generation) => ({
  access_token: jwt([role === "admin" ? "ROLE_SUPER_ADMIN" : "ROLE_USER"], generation),
  refresh_token: `synthetic-${role}-refresh`,
});

const fixtureSource = String.raw`
import React, { useContext, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Link, Route, Routes, useLocation, useParams } from "react-router-dom";
import { SnackbarProvider } from "notistack";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { AuthContext, AuthProvider } from "/src/setup/auth-context-manager/auth-context-manager.jsx";
import PrivateRoute from "/src/setup/routes-manager/private-routes.jsx";
import RoleTypes from "/src/pages/account-manager/utils/enums/role-types.js";
import { createScopedTheme } from "/src/common/theme/scoped-theme.js";
import { createBlankRows } from "/src/pages/indicator-specification-cards/creator/components/dataset/utils/dataset-rows.js";
import { generatePrototypeRows } from "/src/pages/indicator-specification-cards/creator/components/dataset/utils/generated-dataset.js";
import { uploadPlugin } from "/src/pages/admin/utils/plugin-apis.js";

const columns = [
  { field: "course", headerName: "Course", type: "string", dataType: { value: "Categorical" } },
  { field: "score", headerName: "Score", type: "number", dataType: { value: "Numerical" } },
];
const publicTheme = createScopedTheme(createTheme());
function Draft() {
  const { id } = useParams();
  return <h1 data-testid="draft-id">Draft: {id}</h1>;
}
function Fixture() {
  const auth = useContext(AuthContext);
  const location = useLocation();
  const [rows, setRows] = useState([]);
  window.__runtimeFixture = {
    login: auth.login,
    logout: auth.logout,
    snapshot: () => ({ rows, user: auth.user, tokens: auth.authTokens }),
    request: async (name) => {
      const response = await auth.api.get("protected/" + name);
      return { status: response.status, data: response.data, transport: response.request.constructor.name };
    },
    batch: () => Promise.all(["a", "b"].map(async (name) => {
      const response = await auth.api.get("protected/" + name);
      return { status: response.status, data: response.data, transport: response.request.constructor.name };
    })),
    upload: () => uploadPlugin(auth.api, "ANALYTICS_METHOD",
      new File(["synthetic plugin content"], "local-fixture.jar", { type: "application/java-archive" })),
  };
  return <>
    <nav>
      <Link to="/__runtime__/home">Home</Link>{" "}
      <Link to="/__runtime__/draft/draft%20one?kind=isc&search=score%20%26%20age#dataset">Draft link</Link>{" "}
      <Link to="/__runtime__/member">Member page</Link>{" "}
      <Link to="/__runtime__/admin">Admin page</Link>
    </nav>
    <output data-testid="location">{location.pathname + location.search + location.hash}</output>
    <output data-testid="session">{auth.user ? auth.user.roles.join(",") : "anonymous"}</output>
    <Routes>
      <Route path="/__runtime__/home" element={<h1>Home fixture</h1>} />
      <Route path="/__runtime__/draft/:id" element={<Draft />} />
      <Route path="/__runtime__/member" element={<PrivateRoute allowedRoles={[RoleTypes.user]}
        component={<h1 data-testid="protected-member">Member content</h1>} />} />
      <Route path="/__runtime__/admin" element={<PrivateRoute allowedRoles={[RoleTypes.admin]}
        component={<h1 data-testid="protected-admin">Admin content</h1>} />} />
      <Route path="/login" element={<h1>Login fixture</h1>} />
    </Routes>
    <section aria-label="Dataset row factory fixture">
      <button onClick={() => setRows(createBlankRows(columns, 3))}>Create blank dataset</button>
      <button onClick={() => setRows(generatePrototypeRows(columns))}>Generate prototype dataset</button>
      <button onClick={() => setRows((previous) => [...previous, ...createBlankRows(columns, 2)])}>Append blank rows</button>
      {rows.map((row) => <label key={row.id} data-row-id={row.id}>
        Course <input aria-label={"Course " + row.id} value={row.course}
          onChange={(event) => setRows((previous) => previous.map((item) =>
            item.id === row.id ? { ...item, course: event.target.value } : item))} />
      </label>)}
    </section>
    <section aria-label="Public page typography fixture">
      {[400, 500, 600, 700].map((weight) => <Typography key={weight}
        data-testid={"font-" + weight} sx={{ fontFamily: publicTheme.typography.fontFamily, fontWeight: weight }}>
        OpenLAP Ääöü score 123</Typography>)}
    </section>
  </>;
}
createRoot(document.getElementById("fixture")).render(
  <ThemeProvider theme={publicTheme}>
    <SnackbarProvider><BrowserRouter><AuthProvider><Fixture /></AuthProvider></BrowserRouter></SnackbarProvider>
  </ThemeProvider>
);
`;

function htmlSource(production) {
  const script = production ? `<script type="module" src="/scripts/${fixtureName}"></script>` : `<script type="module">
    import RefreshRuntime from "/@react-refresh";
    RefreshRuntime.injectIntoGlobalHook(window);
    window.$RefreshReg$ = () => {};
    window.$RefreshSig$ = () => (type) => type;
    window.__vite_plugin_react_preamble_installed__ = true;
    await import("/scripts/${fixtureName}");
    </script>`;
  return `<!doctype html><html><head><meta charset="utf-8">
    <meta http-equiv="Content-Security-Policy" content="connect-src 'self'; font-src 'self';">
    <title>Isolated runtime regression fixture</title></head>
    <body style="margin:24px"><main id="fixture"></main>${script}</body></html>`;
}

async function waitForSession(page, role) {
  await page.waitForFunction((role) => window.__runtimeFixture?.snapshot().user?.roles.includes(role), role);
}

async function routerChecks(page, base) {
  const deepPath = "/__runtime__/draft/draft%20one?kind=isc&search=score%20%26%20age#dataset";
  await page.goto(new URL(deepPath, base).href);
  await page.getByTestId("draft-id").waitFor();
  assert.equal(await page.getByTestId("draft-id").textContent(), "Draft: draft one");
  assert.equal(await page.getByTestId("location").textContent(), deepPath);
  await page.getByRole("link", { name: "Home", exact: true }).click();
  await page.getByRole("heading", { name: "Home fixture", exact: true }).waitFor();
  await page.goBack();
  await page.getByTestId("draft-id").waitFor();
  assert.equal(new URL(page.url()).searchParams.get("search"), "score & age");
  await page.goForward();
  await page.getByRole("heading", { name: "Home fixture", exact: true }).waitFor();
  await page.getByRole("link", { name: "Draft link", exact: true }).click();
  await page.getByTestId("draft-id").waitFor();
  await page.reload();
  await page.getByTestId("draft-id").waitFor();
  assert.equal(await page.getByTestId("location").textContent(), deepPath);
  await page.getByRole("link", { name: "Member page", exact: true }).click();
  await page.waitForURL(new URL("/login", base).href);
  await page.getByRole("heading", { name: "Login fixture", exact: true }).waitFor();
  assert.equal(await page.getByTestId("protected-member").count(), 0);
  console.log("PASS: BrowserRouter links, decoded deep-link parameters/query/hash, reload, back/forward and anonymous PrivateRoute redirect");
}

async function rejectedStatus(page, name) {
  return page.evaluate(async (name) => {
    try { await window.__runtimeFixture.request(name); return "unexpected success"; }
    catch (error) { return error.response?.status || error.message; }
  }, name);
}

async function authChecks(page, base, state) {
  await page.evaluate((password) => window.__runtimeFixture.login("user@fixture.invalid", password), password);
  await waitForSession(page, "ROLE_USER");
  await page.getByRole("link", { name: "Member page", exact: true }).click();
  await page.getByTestId("protected-member").waitFor();
  await page.getByRole("link", { name: "Admin page", exact: true }).click();
  await page.waitForURL(new URL("/login", base).href);
  assert.equal(await page.getByTestId("protected-admin").count(), 0, "A user role must not open the admin route");

  const batch = await page.evaluate(() => window.__runtimeFixture.batch());
  assert.equal(state.refreshCalls, 1, "Concurrent 401/403 responses must share one real AuthProvider refresh");
  assert.deepEqual(batch.map((response) => response.status), [200, 200]);
  assert.ok(batch.every((response) => response.transport === "XMLHttpRequest"), "Exercise browser XHR, not an in-memory adapter");
  for (const name of ["a", "b"]) {
    assert.deepEqual(state.requests.filter((request) => request.pathname === apiPrefix + "protected/" + name)
      .map((request) => request.authorization), [
      `Bearer ${tokensFor("user", "initial").access_token}`,
      `Bearer ${tokensFor("user", "fresh").access_token}`,
    ], "Replay must send the fresh access token");
  }
  const upload = await page.evaluate(() => window.__runtimeFixture.upload());
  assert.equal(upload.id, "synthetic-upload");
  assert.equal(state.uploads, 1);

  await page.evaluate((password) => window.__runtimeFixture.login("user@fixture.invalid", password), password);
  state.refreshMode = "transient";
  const beforeTransient = state.refreshCalls;
  assert.equal(await rejectedStatus(page, "transient"), 401);
  assert.equal(state.refreshCalls, beforeTransient + 1);
  assert.equal(await page.getByTestId("session").textContent(), "ROLE_USER", "503 refresh must preserve the active session");
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("authTokens")).access_token), tokensFor("user", "initial").access_token);
  state.refreshMode = "success";
  assert.equal((await page.evaluate(() => window.__runtimeFixture.request("recovery"))).status, 200);
  assert.equal(state.refreshCalls, beforeTransient + 2, "Refresh lock must clear after a transient failure");

  await page.evaluate((password) => window.__runtimeFixture.login("user@fixture.invalid", password), password);
  state.refreshMode = "denied";
  assert.equal(await rejectedStatus(page, "denied"), 401);
  await page.waitForURL(new URL("/login", base).href);
  await page.waitForFunction(() => window.__runtimeFixture.snapshot().user === null);
  assert.equal(await page.evaluate(() => localStorage.getItem("authTokens")), null);
  state.refreshMode = "success";

  await page.evaluate((password) => window.__runtimeFixture.login("admin@fixture.invalid", password), password);
  await waitForSession(page, "ROLE_SUPER_ADMIN");
  await page.getByRole("link", { name: "Admin page", exact: true }).click();
  await page.getByTestId("protected-admin").waitFor();
  await page.evaluate(() => window.__runtimeFixture.logout());
  await page.waitForURL(new URL("/login", base).href);
  await page.waitForFunction(() => window.__runtimeFixture.snapshot().user === null);
  await page.getByRole("link", { name: "Admin page", exact: true }).click();
  await page.getByRole("heading", { name: "Login fixture", exact: true }).waitFor();
  assert.equal(await page.getByTestId("protected-admin").count(), 0);
  console.log("PASS: real AuthProvider XHR login/form encoding, single-flight 401/403 token replay, multipart upload, transient/rejected refresh, role protection and logout");
}

async function rowAndFontChecks(page, requestedPaths) {
  const snapshot = () => page.evaluate(() => window.__runtimeFixture.snapshot().rows);
  const validId = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  const seenIds = new Set();
  const remember = (rows) => rows.forEach((row) => {
    assert.match(row.id, validId);
    assert.equal(seenIds.has(row.id), false, "New dataset rows must receive new UUIDs");
    seenIds.add(row.id);
  });
  await page.getByRole("button", { name: "Create blank dataset", exact: true }).click();
  await page.waitForFunction(() => window.__runtimeFixture.snapshot().rows.length === 3);
  const blank = await snapshot();
  remember(blank);
  assert.ok(blank.every((row) => row.course === "" && row.score === ""));
  await page.getByRole("button", { name: "Append blank rows", exact: true }).click();
  await page.waitForFunction(() => window.__runtimeFixture.snapshot().rows.length === 5);
  const appended = await snapshot();
  assert.deepEqual(appended.slice(0, 3), blank, "Appending must preserve existing row identities");
  remember(appended.slice(3));
  await page.getByRole("textbox", { name: "Course " + blank[0].id, exact: true }).fill("Edited course");
  assert.equal((await snapshot())[0].id, blank[0].id);
  assert.equal((await snapshot())[0].course, "Edited course");
  await page.getByRole("button", { name: "Generate prototype dataset", exact: true }).click();
  await page.waitForFunction(() => window.__runtimeFixture.snapshot().rows.length === 6);
  const generated = await snapshot();
  remember(generated);
  assert.equal(generated[0].course, "Mathematics");
  assert.equal(generated[0].score, 62);
  assert.ok(generated.every((row) => typeof row.course === "string" && typeof row.score === "number"));
  console.log("PASS: real blank/prototype dataset factories create unique browser UUIDs, preserve appended/editable row identities and retain typed values");

  const fonts = await page.evaluate(async () => Promise.all([400, 500, 600, 700].map(async (weight) => {
    const loaded = await document.fonts.load(weight + ' 18px "Inter"', "OpenLAP Ääöü score 123");
    const style = getComputedStyle(document.querySelector('[data-testid="font-' + weight + '"]'));
    return { weight, loaded: loaded.map((face) => ({ family: face.family, weight: face.weight, status: face.status })),
      checked: document.fonts.check(weight + ' 18px "Inter"', "OpenLAP Ääöü score 123"),
      family: style.fontFamily, computedWeight: style.fontWeight };
  })));
  for (const font of fonts) {
    assert.ok(font.loaded.length > 0 && font.loaded.every((face) => face.family.replaceAll('"', "") === "Inter" &&
      face.weight === String(font.weight) && face.status === "loaded"), "Expected actual Inter face for weight " + font.weight);
    assert.ok(font.checked && font.family.includes("Inter"), "Scoped typography must apply Inter: " + JSON.stringify(font));
    assert.equal(font.computedWeight, String(font.weight));
    assert.ok(requestedPaths.some((pathname) => pathname.includes("inter-latin-" + font.weight + "-normal") && /\.woff2?(\?|$)/.test(pathname)),
      "Expected a local font asset request for weight " + font.weight);
  }
  console.log("PASS: real scoped public theme loads and applies local Inter 400/500/600/700 faces");
}

async function runMode(production) {
  const base = new URL(`http://127.0.0.1:${production ? 15288 : 15287}`);
  const failures = [], requestedPaths = [];
  const state = { role: "user", refreshMode: "success", refreshCalls: 0, uploads: 0, requests: [] };
  let browser, page, server, outDir, cacheDir;
  let initialBatchCount = 0, releaseBatch;
  const initialBatch = new Promise((resolve) => { releaseBatch = resolve; });
  try {
    const { build, createServer, preview } = await import("vite");
    cacheDir = await fs.mkdtemp(path.join(os.tmpdir(), "openlap-runtime-vite-cache-"));
    const config = { root: appRoot, configFile: path.join(appRoot, "vite.config.js"), logLevel: "warn",
      cacheDir, optimizeDeps: { entries: [htmlPath] },
      define: { "import.meta.env.VITE_BACKEND_URL": JSON.stringify(apiPrefix) } };
    let documentHtml;
    if (production) {
      outDir = await fs.mkdtemp(path.join(os.tmpdir(), "openlap-runtime-production-"));
      console.log("Building isolated production runtime fixture...");
      await build({ ...config, build: { outDir, emptyOutDir: true, rolldownOptions: { input: htmlPath } } });
      documentHtml = await fs.readFile(path.join(outDir, htmlName), "utf8");
      server = await preview({ ...config, build: { outDir }, preview: {
        host: base.hostname, port: Number(base.port), strictPort: true, open: false,
      } });
    } else {
      documentHtml = htmlSource(false);
      server = await createServer({ ...config, server: {
        host: base.hostname, port: Number(base.port), strictPort: true, open: false, hmr: false,
      } });
      await server.listen();
    }
    browser = await webkit.launch({ headless: true,
      ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) });
    const context = await browser.newContext({ viewport: { width: 1200, height: 900 }, serviceWorkers: "block" });
    const respond = (route, status, data) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
    await context.route("**/*", async (route) => {
      const request = route.request(), url = new URL(request.url());
      try {
        if (url.origin !== base.origin || url.pathname.startsWith("/api/")) {
          throw new Error("Blocked unexpected request: " + url.origin + url.pathname);
        }
        requestedPaths.push(url.pathname);
        if (url.pathname.startsWith(apiPrefix)) {
          const authorization = request.headers().authorization;
          state.requests.push({ pathname: url.pathname, authorization, method: request.method() });
          assert.equal(request.resourceType(), "xhr", "Application API calls must use the real browser XHR adapter");
          if (url.pathname === apiPrefix + "login") {
            assert.equal(request.method(), "POST");
            assert.match(request.headers()["content-type"], /^application\/x-www-form-urlencoded/);
            const params = new URLSearchParams(request.postData());
            assert.equal(params.get("password"), password);
            assert.ok(["user@fixture.invalid", "admin@fixture.invalid"].includes(params.get("userEmail")));
            state.role = params.get("userEmail").startsWith("admin") ? "admin" : "user";
            return respond(route, 200, tokensFor(state.role, "initial"));
          }
          if (url.pathname === apiPrefix + "v1/token/refresh") {
            state.refreshCalls++;
            assert.equal(request.method(), "GET");
            assert.equal(authorization, "Bearer synthetic-" + state.role + "-refresh");
            if (state.refreshCalls === 1) {
              let timeout;
              try { await Promise.race([initialBatch, new Promise((resolve) => { timeout = setTimeout(resolve, 2000); })]); }
              finally { clearTimeout(timeout); }
              assert.equal(initialBatchCount, 2, "Both expired requests must arrive before the refresh completes");
            }
            if (state.refreshMode === "transient") return respond(route, 503, { message: "Synthetic temporary failure" });
            if (state.refreshMode === "denied") return respond(route, 403, { message: "Synthetic rejected refresh" });
            return respond(route, 200, { data: tokensFor(state.role, "fresh") });
          }
          if (/^\/__runtime_api__\/protected\/(a|b|transient|recovery|denied)$/.test(url.pathname)) {
            assert.equal(request.method(), "GET");
            if (authorization === `Bearer ${tokensFor(state.role, "fresh").access_token}`) {
              return respond(route, 200, { ok: true });
            }
            assert.equal(authorization, `Bearer ${tokensFor(state.role, "initial").access_token}`);
            if (/\/protected\/[ab]$/.test(url.pathname)) {
              initialBatchCount++;
              if (initialBatchCount === 2) releaseBatch();
            }
            return respond(route, url.pathname.endsWith("/b") ? 403 : 401, { message: "Synthetic expired access token" });
          }
          if (url.pathname === apiPrefix + "v1/admin/plugins/upload") {
            assert.equal(request.method(), "POST");
            assert.equal(authorization, `Bearer ${tokensFor("user", "fresh").access_token}`);
            assert.equal(url.searchParams.get("kind"), "ANALYTICS_METHOD");
            assert.match(request.headers()["content-type"], /^multipart\/form-data; boundary=/);
            // WebKit's intercepted postData omits file bytes; verify the real
            // helper's multipart field, filename and browser-generated boundary.
            assert.match(request.postData(), /name="file"; filename="local-fixture\.jar"/);
            state.uploads++;
            return respond(route, 200, { data: { id: "synthetic-upload" } });
          }
          throw new Error("Blocked unexpected synthetic API path: " + url.pathname);
        }
        if (request.resourceType() === "document") {
          assert.ok(url.pathname.startsWith("/__runtime__/") || url.pathname === "/login", "Unexpected document URL");
          return route.fulfill({ contentType: "text/html", body: documentHtml });
        }
        return route.continue();
      } catch (error) {
        failures.push(error.message);
        return route.abort();
      }
    });
    await context.routeWebSocket(/.*/, (socket) => socket.close());
    page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on("pageerror", (error) => failures.push(error.stack || error.message));
    page.on("response", (response) => {
      if (response.request().resourceType() !== "xhr" && response.status() >= 400) failures.push("Failed asset: " + response.status() + " " + response.url());
    });
    await routerChecks(page, base);
    await authChecks(page, base, state);
    await rowAndFontChecks(page, requestedPaths);
    if (production) {
      assert.ok(requestedPaths.some((pathname) => /^\/assets\/.+\.js$/.test(pathname)), "Load bundled production JavaScript");
      assert.equal(requestedPaths.some((pathname) => /^\/(src|scripts|node_modules|@vite|@react-refresh)(\/|$)/.test(pathname)), false,
        "Production checks must not load development modules");
    }
    assert.deepEqual(failures, [], "No browser errors, missing assets or unexpected traffic");
    console.log(`PASS: WebKit ${production ? "production bundle" : "development"} runtime checks; APIs were stubbed locally and all traffic stayed on loopback`);
  } catch (error) {
    if (failures.length) console.error("Browser diagnostics:", failures);
    if (page) console.error("Fixture diagnostics:", await page.evaluate(() => ({
      url: location.href, text: document.body.innerText.slice(0, 1200), snapshot: window.__runtimeFixture?.snapshot(),
    })).catch(() => "Page unavailable"));
    throw error;
  } finally {
    try { if (browser) await browser.close(); }
    finally {
      try { if (server) await server.close(); }
      finally {
        await Promise.all([
          ...(outDir ? [fs.rm(outDir, { recursive: true, force: true })] : []),
          ...(cacheDir ? [fs.rm(cacheDir, { recursive: true, force: true })] : []),
        ]);
      }
    }
  }
}

(async () => {
  let fixtureWritten = false, htmlWritten = false;
  try {
    await fs.writeFile(fixturePath, fixtureSource, { flag: "wx" });
    fixtureWritten = true;
    await fs.writeFile(htmlPath, htmlSource(true), { flag: "wx" });
    htmlWritten = true;
    await runMode(false);
    await runMode(true);
  } finally {
    await Promise.all([
      ...(fixtureWritten ? [fs.rm(fixturePath, { force: true })] : []),
      ...(htmlWritten ? [fs.rm(htmlPath, { force: true })] : []),
    ]);
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
