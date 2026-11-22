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

  function valueLabelColors(options) {
    const color = hexColor(options.dataLabelsColor) ? options.dataLabelsColor : "#000000";
    const foreColor = hexColor(options.dataLabelsForeColor) ? options.dataLabelsForeColor : "#ffffff";
    return options.showValuesBackground ? { text: foreColor, background: color } : { text: color, background: null };
  }

  function styleValueLabels(target, selector, options) {
    const colors = valueLabelColors(options);
    const decorations = new Map();
    let frame;
    const watch = { subtree: true, childList: true, characterData: true, attributes: true,
      attributeFilter: ["transform", "x", "y", "font-size", "visibility"] };
    const clear = () => {
      for (const [label, { background, fill }] of decorations) {
        background?.remove();
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
        if (!label.textContent.trim()) continue;
        let background;
        if (colors.background && typeof label.getBBox === "function") {
          const { x, y, width, height } = label.getBBox();
          if (width > 0 && height > 0) {
            background = document.createElementNS(svgNamespace, "rect");
            for (const [attribute, value] of Object.entries({ x: x - 3, y: y - 2,
              width: width + 6, height: height + 4, rx: 3, fill: colors.background,
              "pointer-events": "none", "aria-hidden": "true", "data-openlap-value-background": "" })) {
              background.setAttribute(attribute, value);
            }
            const transform = label.getAttribute("transform");
            if (transform) background.setAttribute("transform", transform);
            label.before(background);
          }
        }
        decorations.set(label, { background, fill: label.style.fill });
        label.style.fill = colors.text;
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

  function valueBackgrounds(target, selector, options = {}) {
    return styleValueLabels(target, selector, { ...options, showValuesBackground: true });
  }

  window.OpenLAPChartOptions = Object.freeze({ colorScale, styleValueLabels, valueBackgrounds, valueLabelColors });
}());
