(function () {
  "use strict";
  const base = new URL("./", document.currentScript.src);
  const messages = { ready: "openlap:ready", render: "openlap:render", rendered: "openlap:rendered", error: "openlap:error", height: "openlap:height" };
  const loads = new Map();
  const channel = new URL(location.href).searchParams.get("channel");
  const typeId = new URL(location.href).searchParams.get("typeId");
  const emit = (kind, extra, target = "*") => window.parent.postMessage({ kind, channel, ...extra }, target);
  const failure = (message) => {
    const element = document.getElementById("openlap-error");
    if (element) { element.hidden = false; element.textContent = message; }
  };
  const integrity = (hex) => "sha256-" + btoa(String.fromCharCode(...hex.match(/../g).map((pair) => parseInt(pair, 16))));
  function load(asset) {
    const url = new URL(asset.url, location.href);
    if (url.origin !== location.origin || !url.pathname.startsWith(base.pathname + "visualizations/") || !/^[a-f0-9]{64}$/.test(asset.sha256)) {
      return Promise.reject(new Error("Invalid visualization resource."));
    }
    const key = url.href + ":" + asset.sha256;
    if (loads.has(key)) return loads.get(key);
    const pending = new Promise((resolve, reject) => {
      const element = asset.kind === "style" ? document.createElement("link") : document.createElement("script");
      const timer = setTimeout(() => { element.remove(); reject(new Error("Chart resources did not finish loading.")); }, 20000);
      element.integrity = integrity(asset.sha256);
      element.crossOrigin = "anonymous";
      element.onload = () => { clearTimeout(timer); resolve(); };
      element.onerror = () => { clearTimeout(timer); element.remove(); reject(new Error("A required chart resource could not be loaded.")); };
      if (asset.kind === "style") { element.rel = "stylesheet"; element.href = url.href; }
      else { element.src = url.href; element.async = false; }
      document.head.appendChild(element);
    }).catch((error) => { loads.delete(key); throw error; });
    loads.set(key, pending);
    return pending;
  }
  async function runtime(id) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    let response, envelope;
    try {
      response = await fetch(new URL("visualizations/" + encodeURIComponent(id) + "/runtime", base), { credentials: "omit", cache: "no-store", signal: controller.signal });
      envelope = await response.json();
    } finally { clearTimeout(timer); }
    if (!response.ok) throw new Error(envelope.message || "The visualization runtime is unavailable.");
    const descriptor = envelope.data;
    if (descriptor?.schemaVersion !== 1 || !Array.isArray(descriptor.runtime?.assets) || !Array.isArray(descriptor.assets)) throw new Error("Unsupported visualization runtime.");
    for (const id of descriptor.runtime.assets) {
      const asset = descriptor.assets.find((entry) => entry.id === id);
      if (!asset || !["script", "style"].includes(asset.kind)) throw new Error("A required chart resource is missing.");
      await load(asset);
    }
  }
  if (document.body.dataset.openlapRenderer === "true") {
    const allowedParents = new Set([location.origin, ...(document.body.dataset.parentOrigins || "").split(",")].filter(Boolean));
    let accepted = false;
    let ownerOrigin;
    let reportedFailure = false;
    const report = (error) => {
      if (reportedFailure) return;
      reportedFailure = true;
      const message = error?.message || "The chart could not be rendered. Retry the preview.";
      failure(message); emit(messages.error, { message }, ownerOrigin || "*");
    };
    addEventListener("message", async (event) => {
      const data = event.data;
      if (event.source !== parent || !allowedParents.has(event.origin) || data?.channel !== channel) return;
      if (data.kind === "openlap:hello") { emit(messages.ready, {}, event.origin); return; }
      if (data.kind !== messages.render || accepted) return;
      if (data.typeId !== typeId || typeof data.html !== "string" || typeof data.script !== "string" || data.html.length + data.script.length > 4000000) return;
      accepted = true; ownerOrigin = event.origin;
      try {
        addEventListener("error", (event) => report(event.error || new Error("The chart could not be rendered.")), { once: true });
        addEventListener("unhandledrejection", (event) => report(event.reason), { once: true });
        await runtime(typeId);
        if (reportedFailure) return;
        const container = document.getElementById("openlap-chart");
        container.innerHTML = data.html;
        // Dependencies are separate from generated chart code. The trusted plugin
        // executes in this frame's own globals, never in the embedding platform.
        const script = document.createElement("script");
        script.textContent = data.script;
        document.body.appendChild(script);
        let announced = false;
        const finish = () => {
          if (reportedFailure || announced) return;
          announced = true;
          const height = () => emit(messages.height, { height: Math.min(2000, Math.max(320, Math.ceil(container.getBoundingClientRect().height))) }, ownerOrigin);
          if (typeof ResizeObserver !== "undefined") new ResizeObserver(height).observe(container);
          height(); emit(messages.rendered, {}, ownerOrigin);
        };
        // Browsers throttle animation frames for an embed below the viewport.
        // Its successful initialization must still finish and clear Loading.
        const fallback = setTimeout(finish, 100);
        requestAnimationFrame(() => requestAnimationFrame(() => { clearTimeout(fallback); finish(); }));
      } catch (error) { report(error); }
    });
    emit(messages.ready, {});
    return;
  }
  // Public indicator/question pages embed the same renderer used by the editor.
  document.querySelectorAll("[data-openlap-chart]").forEach((host) => {
    const source = host.querySelector("template[data-chart-code]");
    if (!source || !host.dataset.typeId) return;
    const fragment = source.content.cloneNode(true);
    const scripts = [...fragment.querySelectorAll("script")].map((script) => { const text = script.textContent; script.remove(); return text; });
    const markup = document.createElement("div"); markup.appendChild(fragment);
    const slot = host.querySelector("[data-chart-slot]");
    const status = document.createElement("p"); status.setAttribute("role", "status"); status.textContent = "Loading chart…";
    slot.appendChild(status);
    let cancelPrevious = () => {};
    function mount() {
      cancelPrevious();
      slot.querySelector("iframe")?.remove();
      slot.querySelector("button")?.remove();
      status.textContent = "Loading chart…";
      const key = crypto.randomUUID();
      const frame = document.createElement("iframe");
      frame.title = host.dataset.title || "OpenLAP chart";
      frame.style.cssText = "width:100%;height:500px;border:0;display:block";
      frame.setAttribute("sandbox", "allow-scripts allow-same-origin allow-downloads");
      const url = new URL("render", base); url.searchParams.set("typeId", host.dataset.typeId); url.searchParams.set("channel", key);
      let failed = false;
      const fail = (message) => {
        if (failed) return;
        failed = true; cancelPrevious(); frame.remove();
        status.textContent = message || "The chart could not be loaded.";
        const retry = document.createElement("button"); retry.textContent = "Retry chart";
        retry.onclick = () => mount(); slot.appendChild(retry);
      };
      const timer = setTimeout(() => fail("The chart did not finish loading. Retry the preview."), 45000);
      const receive = (event) => {
        if (event.source !== frame.contentWindow || event.origin !== url.origin || event.data?.channel !== key) return;
        if (event.data.kind === messages.ready) frame.contentWindow.postMessage({ kind: messages.render, channel: key, typeId: host.dataset.typeId, html: markup.innerHTML, script: scripts.join("\n") }, url.origin);
        if (event.data.kind === messages.rendered) { clearTimeout(timer); status.textContent = ""; }
        if (event.data.kind === messages.height && Number.isFinite(event.data.height)) frame.style.height = Math.max(320, Math.min(2000, event.data.height)) + "px";
        if (event.data.kind === messages.error) fail(event.data.message);
      };
      cancelPrevious = () => { clearTimeout(timer); removeEventListener("message", receive); };
      addEventListener("message", receive);
      frame.onload = () => frame.contentWindow.postMessage({ kind: "openlap:hello", channel: key }, url.origin);
      frame.src = url.href; slot.appendChild(frame);
    }
    mount();
  });
}());
