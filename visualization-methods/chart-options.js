(function () {
  "use strict";

  const svgNamespace = "http://www.w3.org/2000/svg";
  const hexColor = (value) => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);

  function colorScale(options, palette) {
    const primary = hexColor(options.seriesColor) ? options.seriesColor.toLowerCase() : "#1976d2";
    const colors = [primary, ...palette.filter((color) => color.toLowerCase() !== primary)];
    const overrides = new Map((options.seriesColors || [])
      .filter(({ key, color }) => typeof key === "string" && hexColor(color))
      .map(({ key, color }) => [key, color]));
    return (key, index) => overrides.get(key) ?? colors[index % colors.length];
  }

  function valueBackgrounds(target, selector) {
    const decorations = new Map();
    let frame;
    const watch = { subtree: true, childList: true, characterData: true, attributes: true,
      attributeFilter: ["transform", "x", "y", "font-size", "visibility"] };
    const clear = () => {
      for (const [label, { background, fill }] of decorations) {
        background.remove();
        label.style.fill = fill;
      }
      decorations.clear();
    };
    const draw = () => {
      frame = undefined;
      observer.disconnect();
      clear();
      if (!target.isConnected) return;
      for (const label of target.querySelectorAll(selector)) {
        if (!label.textContent.trim() || typeof label.getBBox !== "function") continue;
        const { x, y, width, height } = label.getBBox();
        if (!(width > 0 && height > 0)) continue;
        const background = document.createElementNS(svgNamespace, "rect");
        for (const [attribute, value] of Object.entries({ x: x - 3, y: y - 2,
          width: width + 6, height: height + 4, rx: 3, fill: "#ffffff", "fill-opacity": 0.92,
          "pointer-events": "none", "aria-hidden": "true", "data-openlap-value-background": "" })) {
          background.setAttribute(attribute, value);
        }
        const transform = label.getAttribute("transform");
        if (transform) background.setAttribute("transform", transform);
        decorations.set(label, { background, fill: label.style.fill });
        label.style.fill = "#263238";
        label.before(background);
      }
      observer.observe(target, watch);
    };
    const schedule = () => {
      if (frame === undefined) frame = requestAnimationFrame(draw);
    };
    const observer = new MutationObserver(schedule);
    const resize = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    resize?.observe(target);
    draw();
    return () => {
      observer.disconnect();
      resize?.disconnect();
      if (frame !== undefined) cancelAnimationFrame(frame);
      clear();
    };
  }

  window.OpenLAPChartOptions = Object.freeze({ colorScale, valueBackgrounds });
}());
