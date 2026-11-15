// Workflow suites use complete synthetic SVG/HTML fragments, but still exercise
// the actual iframe bootstrap and readiness handshake. Vendor loading, integrity,
// failures and origin rejection are qualified separately by test-chart-runtime.
const fs = require("node:fs");
const path = require("node:path");

module.exports = function chartRendererFixture(base, { runtimeDelayMs = 0 } = {}) {
  const resources = path.resolve(__dirname, "../../analyticsframework/src/main/resources");
  const html = fs.readFileSync(path.join(resources, "templates/chart-renderer.html"), "utf8")
    .replace('th:src="@{/v1/code/runtime.js}"', 'src="/api/v1/code/runtime.js"')
    .replace('th:attr="data-parent-origins=${parentOrigins}"', 'data-parent-origins="' + base.origin + '"');
  const script = fs.readFileSync(path.join(resources, "openlap-chart-runtime/renderer.js"), "utf8");
  const csp = "default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'none'";
  return async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== base.origin) return false;
    if (url.pathname === "/api/v1/code/render") {
      await route.fulfill({ contentType: "text/html; charset=utf-8", body: html,
        headers: { "Content-Security-Policy": csp } });
    } else if (url.pathname === "/api/v1/code/runtime.js") {
      await route.fulfill({ contentType: "text/javascript; charset=utf-8", body: script });
    } else if (/^\/api\/v1\/code\/visualizations\/[^/]+\/runtime$/.test(url.pathname)) {
      if (runtimeDelayMs) await new Promise((resolve) => setTimeout(resolve, runtimeDelayMs));
      await route.fulfill({ contentType: "application/json", body: JSON.stringify({ data: {
        schemaVersion: 1, artifactId: "synthetic-workflow-chart", chart: { runtimeId: "workflow-svg" },
        runtime: { id: "workflow-svg", version: "1.0.0", assets: [] }, assets: [],
      } }) });
    } else return false;
    return true;
  };
};
