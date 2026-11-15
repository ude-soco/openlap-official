// Exercise the actual anonymous entry route before authenticated editor tests.
// Every API response is synthetic; external assets are replaced or blocked.
const { webkit } = require("playwright");
const assert = require("node:assert/strict");

const base = new URL(process.env.OPENLAP_TEST_BASE_URL || "http://127.0.0.1:5181");
assert.equal(base.protocol, "http:");
assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(base.hostname));
(async () => {
  const browser = await webkit.launch({ headless: true,
    ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}),
  });
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const errors = [], unexpected = [];
  try {
    await context.routeWebSocket(/.*/, (socket) => socket.close());
    await context.route("**/*", async (route) => {
      const request = route.request(), url = new URL(request.url());
      const send = (data) => route.fulfill({ contentType: "application/json",
        body: JSON.stringify({ data }) });
      if (url.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)
          && url.pathname.startsWith("/api/")) {
        const path = url.pathname.slice(5);
        if (/^v1\/content\/(news|publications)$/.test(path)) {
          return send({ content: [], totalElements: 0 });
        }
        if (path === "v1/register/lrs") return send([]);
        unexpected.push("Unexpected API path: " + path);
        return route.abort();
      }
      if (url.origin === base.origin) return route.continue();
      if (/^https:\/\/(cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|d3js\.org)\//.test(url.href)) {
        return route.fulfill({ contentType: url.pathname.endsWith(".css")
          ? "text/css" : "application/javascript", body: "/* Not used on public pages. */" });
      }
      // Marketing pictures may be remote; no external network request is sent.
      if (request.resourceType() === "image") return route.abort();
      unexpected.push("Unexpected external request: " + url.origin + url.pathname);
      return route.abort();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on("pageerror", (error) => errors.push({ path: new URL(page.url()).pathname, message: error.message }));
    const button = (name) => page.getByRole("button", { name, exact: true });

    await page.goto(new URL("/", base).href);
    const desktopNav = page.getByRole("navigation", { name: "Homepage sections", exact: true });
    await desktopNav.getByRole("button", { name: "Features", exact: true }).waitFor();
    await desktopNav.getByRole("button", { name: "Features", exact: true }).focus();
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => window.scrollY > 0);
    await button("OpenLAP, back to top").click();
    await button("Sign in").click();
    await page.waitForURL("**/login");
    await page.getByRole("heading", { name: "Welcome back", exact: true }).waitFor();

    for (const [path, heading] of [["/register", "Create your account"],
      ["/privacy", "Privacy Policy"], ["/news", "News"], ["/publications", "Publications"]]) {
      await page.goto(new URL(path, base).href);
      await page.getByRole("heading", { name: heading, exact: true }).waitFor();
      await page.waitForLoadState("networkidle");
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(new URL("/", base).href);
    await button("menu").click();
    const mobileNav = page.getByRole("navigation", { name: "Mobile homepage sections", exact: true });
    await mobileNav.getByRole("button", { name: "News", exact: true }).click();
    await mobileNav.waitFor({ state: "hidden" });
    await page.waitForFunction(() => window.scrollY > 0);
    await button("menu").click();
    await button("Sign in").click();
    await page.waitForURL("**/login");
    await page.getByRole("textbox", { name: "Email Address", exact: true }).waitFor();
    await page.getByLabel("Password", { exact: true }).waitFor();
    await page.reload();
    await page.getByRole("heading", { name: "Welcome back", exact: true }).waitFor();
    assert.deepEqual(errors, [], "Guest homepage and public routes render without exceptions");
    assert.deepEqual(unexpected, [], "All requests remain local and expected");
    console.log("PASS: guest homepage, keyboard section navigation, public routes, mobile drawer and login entry/reload.");
  } finally {
    await context.close();
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
