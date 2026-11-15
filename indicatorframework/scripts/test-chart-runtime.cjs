// Exercise the actual OpenLAP renderer document/script and React preview using
// local, hash-declared resources. No database, application rollout or CDN access.
// OPENLAP_EXAMPLE_PLUGIN_JAR optionally qualifies the template's built example.
const { webkit } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const http = require("node:http");
const crypto = require("node:crypto");
const { spawn, execFileSync } = require("node:child_process");

const appRoot = path.resolve(__dirname, "..");
const resources = path.resolve(appRoot, "../analyticsframework/src/main/resources");
const port = Number(process.env.OPENLAP_RUNTIME_TEST_PORT || 5191);
const frontend = new URL("http://127.0.0.1:" + port);
const fixturePath = path.join(__dirname, ".chart-runtime-" + process.pid + ".jsx");
const htmlPath = path.join(appRoot, ".chart-runtime-" + process.pid + ".html");
const digest = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const points = [{ label: "Alpha", value: 3 }, { label: "Beta", value: 8 }, { label: "Gamma", value: 5 }];
const nativeFallback = `(function(){window.OpenLAPExample={version:"1.0.0",render:function(container,points,options){
 const ns="http://www.w3.org/2000/svg",svg=document.createElementNS(ns,"svg");
 svg.setAttribute("viewBox","0 0 400 320");svg.setAttribute("role","img");svg.setAttribute("aria-label",options.chartTitle);
 points.forEach(function(point,index){const mark=document.createElementNS(ns,"rect");mark.setAttribute("class","chart-mark");
 mark.setAttribute("x",40+index*110);mark.setAttribute("y",250-point.value*20);mark.setAttribute("width",60);
 mark.setAttribute("height",point.value*20);mark.setAttribute("fill",options.seriesColor);svg.appendChild(mark);});container.replaceChildren(svg);
}};}());`;

function chartCode(type, title = "Native chart") {
  if (type === "static" || type === "missing") return "";
  if (type === "c3") return "c3.generate({bindto:'#chart',size:{height:360},data:{columns:[['Value',3,8,5]],type:'bar'},axis:{x:{type:'category',categories:['Alpha','Beta','Gamma']}},transition:{duration:0}});";
  if (type === "apex") return "new ApexCharts(document.querySelector('#chart'),{chart:{type:'bar',height:360,animations:{enabled:false}},series:[{name:'Value',data:[3,8,5]}],xaxis:{categories:['Alpha','Beta','Gamma']}}).render();";
  return "window.OpenLAPExample.render(document.getElementById('chart')," + JSON.stringify(points) + "," + JSON.stringify({
    chartTitle: title, seriesColor: "#1976d2", height: 420, showGrid: true, showValues: true, valueLabelPosition: "above",
  }) + ",'bar');";
}

async function nativeAssets() {
  if (!process.env.OPENLAP_EXAMPLE_PLUGIN_JAR) return [
    { id: "svg-style", kind: "style", bytes: Buffer.from("svg{width:100%;height:auto}.chart-mark{stroke:white}") },
    { id: "svg-script", kind: "script", bytes: Buffer.from(nativeFallback) },
  ];
  const jar = path.resolve(process.env.OPENLAP_EXAMPLE_PLUGIN_JAR);
  const entry = (name) => execFileSync("unzip", ["-p", jar, name], { maxBuffer: 16 * 1024 * 1024 });
  const manifest = JSON.parse(entry("META-INF/openlap/visualization.json").toString());
  assert.equal(manifest.schemaVersion, 1);
  const runtime = manifest.runtimes.find((item) => item.id === manifest.charts[0].runtimeId);
  return runtime.assets.map((id) => {
    const asset = manifest.assets.find((item) => item.id === id);
    const bytes = entry(asset.path);
    assert.equal(digest(bytes), asset.sha256, "The example JAR resource matches its declared hash");
    return { id, kind: asset.kind, bytes };
  });
}

async function until(predicate, message) {
  const deadline = Date.now() + 20000;
  while (!predicate()) { assert.ok(Date.now() < deadline, message); await pause(20); }
}

(async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "openlap-chart-runtime-ui-"));
  let backend, attacker, vite, browser, svgExport;
  let viteOutput = "";
  const errors = [], expectedScriptErrors = [], unexpected = [], runtimeRequests = [], assetRequests = [];
  const plans = new Map();
  try {
    const renderer = await fs.readFile(path.join(resources, "openlap-chart-runtime/renderer.js"));
    const rendererDocument = (await fs.readFile(path.join(resources, "templates/chart-renderer.html"), "utf8"))
      .replace('th:src="@{/v1/code/runtime.js}"', 'src="/api/v1/code/runtime.js"')
      .replace('th:attr="data-parent-origins=${parentOrigins}"', 'data-parent-origins="' + frontend.origin + '"');
    const vendor = async (id, kind, filename) => ({ id, kind, bytes: await fs.readFile(path.join(resources, "openlap-chart-runtime/vendor", filename)) });
    const native = await nativeAssets();
    const second = native.map((asset) => asset.kind !== "script" ? asset : {
      ...asset, bytes: Buffer.from(asset.bytes.toString().replace(/version:\s*"1\.0\.0"/, 'version:"2.0.0"')),
    });
    assert.notEqual(digest(second.find((asset) => asset.kind === "script").bytes), digest(native.find((asset) => asset.kind === "script").bytes));
    const types = {
      c3: { version: "0.7.18", assets: [await vendor("c3-css", "style", "c3-0.7.18.min.css"), await vendor("d3", "script", "d3-5.16.0.min.js"), await vendor("c3", "script", "c3-0.7.18.min.js")] },
      apex: { version: "8.8.1", assets: [await vendor("apex", "script", "apexcharts-8.8.1.min.js")] },
      native: { version: "1.0.0", assets: native },
      "native-v2": { version: "2.0.0", assets: second },
      static: { version: "1.0.0", assets: [{ id: "static-style", kind: "style", bytes: Buffer.from(".static-mark{fill:rgb(11,22,33)}") }] },
      throwing: { version: "1.0.0", assets: [{ id: "broken-script", kind: "script", bytes: Buffer.from('throw new Error("Synthetic runtime script failure.");') }] },
    };
    for (const value of Object.values(types)) value.artifact = digest(Buffer.concat(value.assets.map((asset) => asset.bytes)));
    backend = http.createServer(async (request, response) => {
      try {
        const url = new URL(request.url, "http://127.0.0.1");
        const send = (bytes, type = "text/html", status = 200) => {
          if (response.destroyed) return;
          response.writeHead(status, { "Content-Type": type + "; charset=utf-8", "X-Content-Type-Options": "nosniff",
            ...(url.pathname === "/api/v1/code/render" ? {
              "Content-Security-Policy": "default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'none'",
            } : {}),
          }); response.end(bytes);
        };
        if (url.pathname === "/api/v1/code/render") return send(rendererDocument);
        if (url.pathname === "/api/v1/code/runtime.js") return send(renderer, "text/javascript");
        const runtime = url.pathname.match(/^\/api\/v1\/code\/visualizations\/([^/]+)\/runtime$/);
        if (runtime) {
          const id = decodeURIComponent(runtime[1]), type = types[id];
          runtimeRequests.push(id);
          const plan = plans.get(id)?.shift() || {};
          if (plan.delay) await pause(plan.delay);
          if (plan.fail) return send(JSON.stringify({ message: "Synthetic runtime unavailable." }), "application/json", 503);
          if (!type) return send(JSON.stringify({ message: "No browser runtime is declared for this plugin." }), "application/json", 404);
          return send(JSON.stringify({ data: {
            schemaVersion: 1, artifactId: type.artifact,
            chart: { id, runtimeId: id }, runtime: { id, version: type.version, assets: type.assets.map((asset) => asset.id) },
            assets: type.assets.map((asset) => ({ id: asset.id, kind: asset.kind,
              sha256: plan.integrity && asset.kind === "script" ? "0".repeat(64) : digest(asset.bytes),
              url: "/api/v1/code/visualizations/" + id + "/assets/" + type.artifact + "/" + asset.id })),
          } }), "application/json");
        }
        const resource = url.pathname.match(/^\/api\/v1\/code\/visualizations\/([^/]+)\/assets\/([^/]+)\/([^/]+)$/);
        if (resource) {
          const [, id, artifact, assetId] = resource, type = types[id];
          const asset = type?.artifact === artifact && type.assets.find((item) => item.id === assetId);
          assetRequests.push({ id, assetId });
          return asset ? send(asset.bytes, asset.kind === "style" ? "text/css" : "text/javascript") : send("Not found", "text/plain", 404);
        }
        if (url.pathname === "/host.html") {
          return send('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><h1>External platform</h1>' + ["native", "c3", "apex"].map((id) => '<iframe title="Embedded ' + id + '" src="/embed.html?type=' + id + '" style="width:100%;height:560px;border:0"></iframe>').join("") + '</body></html>');
        }
        if (url.pathname === "/embed.html") {
          const type = url.searchParams.get("type") || "native";
          return send('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><script defer src="/api/v1/code/runtime.js"></script></head><body><section data-openlap-chart data-type-id="' + type + '" data-title="Embedded ' + type + '"><template data-chart-code><div id="chart"></div><script>' + chartCode(type, "Embedded native chart") + '</script></template><div data-chart-slot></div></section></body></html>');
        }
        return send("Not found", "text/plain", 404);
      } catch (error) { errors.push(error.message); if (!response.destroyed) { response.writeHead(500); response.end("Synthetic server failed."); } }
    });
    await new Promise((resolve) => backend.listen(0, "127.0.0.1", resolve));
    const api = new URL("http://127.0.0.1:" + backend.address().port + "/api/");
    attacker = http.createServer((_, response) => {
      response.writeHead(200, { "Content-Type": "text/html" });
      response.end('<!doctype html><html><body><iframe id="probe" src="' + new URL("v1/code/render?typeId=native&channel=untrusted-probe", api).href + '"></iframe><script>addEventListener("message",function(event){if(event.data?.kind!=="openlap:ready")return;window.attempted=true;document.getElementById("probe").contentWindow.postMessage({kind:"openlap:render",channel:"untrusted-probe",typeId:"native",html:"<p id=untrusted-probe>Untrusted markup</p>",script:"window.attackerExecuted=true;"},' + JSON.stringify(api.origin) + ');});</script></body></html>');
    });
    await new Promise((resolve) => attacker.listen(0, "127.0.0.1", resolve));
    const attackerOrigin = "http://127.0.0.1:" + attacker.address().port;
    const fixtureSource = `
import React, {useState} from "react";
import {createRoot} from "react-dom/client";
import {ThemeProvider,createTheme} from "@mui/material/styles";
import {Stack} from "@mui/material";
import ChartPreview from "/src/pages/indicators/indicator-editor/components/chart-preview.jsx";
import {AuthContext} from "/src/setup/auth-context-manager/auth-context-manager.jsx";
const scripts=${JSON.stringify(Object.fromEntries(["c3", "apex", "native", "native-v2", "static", "missing", "throwing", "undeclared"].map((id) => [id, chartCode(id, "Native chart")])))};
const staticMarkup='<svg width="100%" height="320" role="img" aria-label="Static stylesheet chart"><rect class="static-mark" width="100" height="100"/></svg>';
function Fixture(){const [types,setTypes]=useState(["c3"]);const [revision,setRevision]=useState(0);
window.__chartRuntimeFixture={show:(...next)=>setTypes(next),update:()=>setRevision(value=>value+1)};
return <ThemeProvider theme={createTheme()}><AuthContext.Provider value={{api:{defaults:{baseURL:${JSON.stringify(api.href)}}}}}>
<Stack component="main" sx={{gap:2,width:"100%",maxWidth:1000,mx:"auto"}}>
<h1>OpenLAP isolated chart preview fixture</h1>
{types.map((id,index)=><section key={index} data-chart={id}><ChartPreview responsive visualizationTypeId={id==="missing"?undefined:id} previewData={{html:id==="static"||id==="missing"?staticMarkup:'<div id="chart"></div>',scriptData:scripts[id]+(revision?'\\nwindow.updatedTitle='+revision+';':'')}} /></section>)}
</Stack></AuthContext.Provider></ThemeProvider>;}
createRoot(document.getElementById("fixture")).render(<Fixture/>);`;
    await fs.writeFile(fixturePath, fixtureSource);
    await fs.writeFile(htmlPath, '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="fixture"></div><script type="module" src="/scripts/' + path.basename(fixturePath) + '"></script></body></html>');
    const config = path.join(temporary, "vite.config.mjs");
    await fs.writeFile(config, "import base from " + JSON.stringify(path.join(appRoot, "vite.config.js")) + ";export default {...base,root:" + JSON.stringify(appRoot) + ",cacheDir:" + JSON.stringify(path.join(temporary, "cache")) + ",server:{host:'127.0.0.1',port:" + port + ",strictPort:true,fs:{allow:" + JSON.stringify([appRoot, await fs.realpath(path.join(appRoot, "node_modules")), temporary]) + "}}};");
    vite = spawn(process.execPath, [path.join(appRoot, "node_modules/vite/bin/vite.js"), "--config", config], { cwd: appRoot, stdio: ["ignore", "pipe", "pipe"] });
    vite.stdout.on("data", (chunk) => { viteOutput += chunk; }); vite.stderr.on("data", (chunk) => { viteOutput += chunk; });
    for (let attempt = 0; attempt < 200; attempt++) {
      try { if ((await fetch(frontend)).ok) break; } catch { /* Starting Vite. */ }
      assert.equal(vite.exitCode, null, "The synthetic Vite server stays running"); await pause(100);
    }
    browser = await webkit.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) });
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    await context.routeWebSocket(/.*/, (socket) => socket.close());
    await context.route("**/*", (route) => {
      if (![frontend.origin, api.origin, attackerOrigin].includes(new URL(route.request().url()).origin)) { unexpected.push(route.request().url()); return route.abort(); }
      return route.continue();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    page.on("pageerror", (error) => error.message === "Synthetic runtime script failure."
      ? expectedScriptErrors.push(error.message) : errors.push(error.message));
    await page.goto(new URL(path.basename(htmlPath), frontend).href);
    const preview = (type) => page.locator('[data-chart="' + type + '"]');
    const frame = (type) => preview(type).frameLocator("iframe");
    const loaded = async (type) => {
      await frame(type).locator(type === "c3" ? ".c3 svg" : type === "apex" ? ".apexcharts-svg" : "svg[role=img]").waitFor();
      await preview(type).locator('iframe[aria-busy="false"]').waitFor();
    };
    await loaded("c3");
    assert.equal(await frame("c3").locator(".c3-bar").count(), 3);
    assert.equal(await frame("c3").locator("body").evaluate(() => typeof window.d3), "object");
    await page.evaluate(() => window.__chartRuntimeFixture.show("static")); await loaded("static");
    assert.equal(await frame("static").locator(".static-mark").evaluate((element) => getComputedStyle(element).fill), "rgb(11, 22, 33)",
      "A static SVG without inline JavaScript still receives its declared packaged CSS inside the renderer");
    await page.evaluate(() => window.__chartRuntimeFixture.show("missing"));
    await preview("missing").getByRole("alert").filter({ hasText: "missing its visualization type" }).waitFor();
    assert.equal(await preview("missing").locator("iframe").count(), 0, "Untyped chart fragments receive a metadata error instead of executing in the host");
    await page.evaluate(() => window.__chartRuntimeFixture.show("apex")); await loaded("apex");
    assert.equal(await frame("apex").locator(".apexcharts-bar-area").count(), 3);
    const [downloaded] = await Promise.all([
      page.waitForEvent("download"),
      (async () => {
        await frame("apex").getByRole("button", { name: "Menu", exact: true }).click();
        await frame("apex").getByText("Download SVG", { exact: true }).click();
      })(),
    ]);
    assert.match(downloaded.suggestedFilename(), /\.svg$/);
    const exported = await fs.readFile(await downloaded.path(), "utf8");
    assert.match(exported, /<svg[\s>]/); assert.match(exported, /Alpha/);
    svgExport = { filename: downloaded.suggestedFilename(), bytes: Buffer.byteLength(exported), sha256: digest(exported), categoryLabelsPreserved: true };
    await page.evaluate(() => window.__chartRuntimeFixture.show("native")); await loaded("native");
    assert.equal(await frame("native").locator(".chart-mark").count(), 3);
    const beforeUpdate = runtimeRequests.length;
    await page.evaluate(() => window.__chartRuntimeFixture.update());
    await until(() => runtimeRequests.length > beforeUpdate, "Editing a preview creates a fresh render document");
    await loaded("native");
    assert.equal(await frame("native").locator("body").evaluate(() => window.updatedTitle), 1);
    assert.deepEqual(await page.evaluate(() => [typeof window.c3, typeof window.d3, typeof window.ApexCharts, typeof window.OpenLAPExample]), ["undefined", "undefined", "undefined", "undefined"]);
    plans.set("native", [{ fail: true }]);
    await page.evaluate(() => window.__chartRuntimeFixture.update());
    await preview("native").getByRole("alert").filter({ hasText: "Synthetic runtime unavailable." }).waitFor();
    const failedCount = runtimeRequests.length; await pause(700);
    assert.equal(runtimeRequests.length, failedCount, "Failed rendering waits for explicit retry");
    await preview("native").getByRole("button", { name: "Retry chart", exact: true }).click(); await loaded("native");
    await page.evaluate(() => window.__chartRuntimeFixture.show("undeclared"));
    await preview("undeclared").getByRole("alert").filter({ hasText: "No browser runtime is declared for this plugin." }).waitFor();
    types.undeclared = types.native;
    await preview("undeclared").getByRole("button", { name: "Retry chart", exact: true }).click(); await loaded("undeclared");
    await page.evaluate(() => window.__chartRuntimeFixture.show("throwing"));
    await preview("throwing").getByRole("alert").filter({ hasText: "Synthetic runtime script failure." }).waitFor();
    assert.equal(await frame("throwing").locator("#openlap-chart > *").count(), 0, "A failing runtime never executes chart initialization");
    assert.ok(expectedScriptErrors.length > 0, "The deliberately broken runtime exercised the global error handler");
    await page.evaluate(() => window.__chartRuntimeFixture.show("native")); await loaded("native");
    plans.set("native", [{ integrity: true }]);
    await page.evaluate(() => window.__chartRuntimeFixture.update());
    await preview("native").getByRole("alert").filter({ hasText: "A required chart resource could not be loaded." }).waitFor();
    await preview("native").getByRole("button", { name: "Retry chart", exact: true }).click(); await loaded("native");
    plans.set("native", [{ delay: 1000, fail: true }]);
    const beforeSlow = runtimeRequests.length;
    await page.evaluate(() => window.__chartRuntimeFixture.update());
    await until(() => runtimeRequests.length > beforeSlow, "Delayed old runtime request starts");
    await page.evaluate(() => {
      const iframe = document.querySelector('[data-chart="native"] iframe');
      window.__obsoleteChannel = new URL(iframe.src).searchParams.get("channel");
      window.postMessage({ kind: "openlap:rendered", channel: window.__obsoleteChannel }, "*");
    });
    assert.equal(await preview("native").locator("iframe").getAttribute("aria-busy"), "true", "A message from the parent cannot impersonate a renderer acknowledgement");
    await page.evaluate(() => window.__chartRuntimeFixture.show("c3")); await loaded("c3"); await pause(1200);
    await page.evaluate(() => window.postMessage({ kind: "openlap:error", channel: window.__obsoleteChannel, message: "Obsolete failure" }, "*"));
    assert.equal(await page.getByRole("alert").count(), 0, "An obsolete frame cannot overwrite the current chart");
    await page.evaluate(() => window.__chartRuntimeFixture.show("native", "native-v2"));
    await loaded("native"); await loaded("native-v2");
    assert.equal(await frame("native").locator("body").evaluate(() => window.OpenLAPExample.version), "1.0.0");
    assert.equal(await frame("native-v2").locator("body").evaluate(() => window.OpenLAPExample.version), "2.0.0");
    await page.setViewportSize({ width: 390, height: 1000 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "Frames fit a mobile host");
    await page.goto(new URL("/host.html", api).href);
    assert.equal(await page.locator("script").count(), 0, "The external platform includes no chart scripts");
    for (const id of ["native", "c3", "apex"]) {
      const embedded = page.frameLocator('iframe[title="Embedded ' + id + '"]');
      const inner = embedded.frameLocator("iframe");
      await inner.locator(id === "c3" ? ".c3 svg" : id === "apex" ? ".apexcharts-svg" : "svg[role=img]").waitFor();
      try {
        await embedded.locator('[data-chart-slot] [role="status"]').filter({ hasText: /^$/ }).waitFor({ state: "attached", timeout: 5000 });
      } catch (error) {
        console.error("Public embed status:", id, await embedded.locator('[data-chart-slot]').innerText());
        console.error("Browser errors:", errors);
        throw error;
      }
      assert.equal(await embedded.locator('[data-chart-slot] [role="status"]').textContent(), "");
    }
    assert.deepEqual(await page.evaluate(() => [typeof window.c3, typeof window.ApexCharts, typeof window.OpenLAPExample]), ["undefined", "undefined", "undefined"]);
    if (process.env.OPENLAP_RUNTIME_PROOF_DIR) {
      await fs.mkdir(process.env.OPENLAP_RUNTIME_PROOF_DIR, { recursive: true });
      await page.screenshot({ path: path.join(process.env.OPENLAP_RUNTIME_PROOF_DIR, "blank-platform-runtime-embed.png"), fullPage: true });
    }
    const beforeAttack = runtimeRequests.length;
    await page.goto(attackerOrigin);
    await page.waitForFunction(() => window.attempted === true);
    await pause(1000);
    assert.equal(await page.frameLocator("iframe").locator("#untrusted-probe").count(), 0,
      "An arbitrary external origin cannot inject markup into the public renderer");
    assert.equal(await page.frameLocator("iframe").locator("body").evaluate(() => window.attackerExecuted), undefined,
      "An arbitrary external origin cannot execute chart scripts with the backend origin");
    assert.equal(runtimeRequests.length, beforeAttack, "Untrusted render messages never trigger runtime loading");
    assert.deepEqual(errors, []); assert.deepEqual(unexpected, []);
    if (process.env.OPENLAP_RUNTIME_PROOF_DIR) {
      await fs.mkdir(process.env.OPENLAP_RUNTIME_PROOF_DIR, { recursive: true });
      await fs.writeFile(path.join(process.env.OPENLAP_RUNTIME_PROOF_DIR, "runtime-browser-proof.json"), JSON.stringify({ runtimes: ["native", "c3", "apex"], runtimeRequests, assetRequests,
        nativeJar: Boolean(process.env.OPENLAP_EXAMPLE_PLUGIN_JAR), multipleVersions: true, retries: true, integrityFailure: true,
        svgExport, staticStylesheet: true, missingMetadataRejected: true, undeclaredRuntimeRetry: true, scriptLoadFailure: true,
        staleFrameRejected: true, untrustedParentRejected: true, hostGlobalsAbsent: true, externalRequests: unexpected, browserErrors: errors }, null, 2));
    }
    console.log("PASS: real renderer and packaged C3/Apex/native assets; isolated previews and blank-platform embeds; SVG export; retry/integrity/script failures; stale and untrusted messages; simultaneous versions; no host globals or CDN requests");
    await context.close();
  } catch (error) { console.error(viteOutput.slice(-2000)); throw error; }
  finally {
    if (browser) await browser.close();
    if (vite && vite.exitCode == null) { vite.kill("SIGTERM"); await new Promise((resolve) => vite.once("exit", resolve)); }
    if (attacker) { attacker.closeAllConnections(); await new Promise((resolve) => attacker.close(resolve)); }
    if (backend) { backend.closeAllConnections(); await new Promise((resolve) => backend.close(resolve)); }
    await fs.rm(fixturePath, { force: true }); await fs.rm(htmlPath, { force: true }); await fs.rm(temporary, { recursive: true, force: true });
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
