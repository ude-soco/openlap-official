(function () {
  "use strict";

  const types = new Map([
    ["bar", "bar"], ["line", "line"], ["area", "area"],
    ["pie", "pie"], ["donut", "donut"], ["scatter", "scatter"],
    ["grouped-area", "area"], ["stacked-area", "area"], ["multi-line", "line"],
  ]);
  const palette = ["#1976d2", "#b2458b", "#168370", "#b85417", "#6253b4", "#7c6417", "#55744a", "#b64550"];
  const charts = new WeakMap();

  function html(text) {
    return String(text).replace(/[&<>"']/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[character]);
  }

  function categoricalData(rows, kind, options) {
    const categories = [];
    const columns = [];
    const names = {};
    const colorKeys = {};
    const circular = kind === "pie" || kind === "donut";
    const grouped = kind === "grouped-area" || kind === "stacked-area" || kind === "multi-line";
    if (circular) {
      if (rows.some(row => row.value < 0) || rows.every(row => row.value === 0)) {
        throw new Error("Pie and donut charts need non-negative values and at least one positive value.");
      }
      rows.forEach(({ category, value }, index) => {
        const id = `slice_${index}`;
        names[id] = category;
        colorKeys[id] = category;
        columns.push([id, value]);
      });
    } else if (grouped) {
      const positions = new Map();
      const groups = new Map();
      for (const { category, series, value } of rows) {
        if (!positions.has(category)) {
          positions.set(category, categories.length);
          categories.push(category);
        }
        if (!groups.has(series)) groups.set(series, new Map());
        const group = groups.get(series);
        const index = positions.get(category);
        if (group.has(index)) {
          throw new Error("Each series needs at most one value per category. Aggregate repeated pairs in the analysis.");
        }
        group.set(index, value);
      }
      for (const [series, values] of groups) {
        const id = `series_${columns.length}`;
        names[id] = series;
        colorKeys[id] = series;
        columns.push([id, ...categories.map((_, index) => values.get(index) ?? null)]);
      }
    } else {
      categories.push(...rows.map(row => row.category));
      names.value = options.yAxisLabel || "Value";
      colorKeys.value = null;
      columns.push(["value", ...rows.map(row => row.value)]);
    }
    const data = { columns, names };
    if (kind === "stacked-area") data.groups = [Object.keys(names)];
    return { data, categories, colorKeys };
  }

  function scatterData(rows) {
    const groups = new Map();
    const hasGroups = rows.some(row => row.series != null);
    for (const row of rows) {
      const series = row.series ?? null;
      if (!groups.has(series)) groups.set(series, []);
      groups.get(series).push(row);
    }
    const columns = [];
    const names = {};
    const colorKeys = {};
    const xs = {};
    const points = new Map();
    for (const [series, group] of groups) {
      const id = `series_${points.size}`;
      const xId = `x_${points.size}`;
      group.sort((first, second) => first.x - second.x);
      points.set(id, group);
      names[id] = series ?? (hasGroups ? "Ungrouped" : "Observations");
      colorKeys[id] = series;
      xs[id] = xId;
      columns.push([xId, ...group.map(point => point.x)], [id, ...group.map(point => point.y)]);
    }
    return { data: { columns, names, xs, xSort: false }, points, colorKeys };
  }

  function tooltip(names, categories, points) {
    return entries => {
      const values = entries.filter(entry => Number.isFinite(entry?.value));
      if (!values.length) return "";
      const first = values[0];
      const title = points ? points.get(first.id)?.[first.index]?.label : categories?.[first.x];
      const header = title ? `<tr><th colspan="2">${html(title)}</th></tr>` : "";
      const rows = values.map(entry => {
        const value = points ? `${entry.x}, ${entry.value}` : entry.value;
        return `<tr><td class="name">${html(names[entry.id])}</td><td class="value">${html(value)}</td></tr>`;
      }).join("");
      return `<table class="c3-tooltip"><tbody>${header}${rows}</tbody></table>`;
    };
  }

  function destroy(target) {
    const previous = charts.get(target);
    if (previous) {
      previous.observer?.disconnect();
      previous.clearValueLabelStyles?.();
      previous.chart.destroy();
      charts.delete(target);
    }
    target.replaceChildren();
  }

  function addHeading(target, options) {
    if (!options.chartTitle && !options.chartSubtitle) return;
    const heading = document.createElement("div");
    heading.style.cssText = "padding:8px 12px 4px;overflow-wrap:anywhere";
    heading.style.textAlign = options.titlePosition || "center";
    for (const [className, text] of [["c3-title", options.chartTitle], ["c3-subtitle", options.chartSubtitle]]) {
      if (!text) continue;
      const line = document.createElement("div");
      line.className = className;
      line.textContent = text;
      line.style.fontSize = className === "c3-title" ? "18px" : "14px";
      if (className === "c3-title") line.style.fontWeight = "600";
      heading.appendChild(line);
    }
    target.appendChild(heading);
  }

  function addLegend(legend, getChart, names, colors, useSeriesColors) {
    for (const [id, name] of Object.entries(names)) {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "c3-legend-item";
      item.setAttribute("aria-pressed", "true");
      item.style.cssText = "display:flex;align-items:center;gap:6px;min-width:0;padding:4px 5px;border:0;"
        + "border-radius:4px;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer";
      const tile = document.createElement("span");
      tile.style.cssText = "width:10px;height:10px;flex:none;border-radius:2px";
      tile.style.backgroundColor = colors[id];
      const label = document.createElement("span");
      label.style.overflowWrap = "anywhere";
      if (useSeriesColors) label.style.color = colors[id];
      label.textContent = name;
      item.append(tile, label);
      item.addEventListener("click", () => {
        const visible = item.getAttribute("aria-pressed") === "true";
        getChart().toggle(id);
        item.setAttribute("aria-pressed", String(!visible));
        item.style.opacity = visible ? "0.48" : "1";
      });
      item.addEventListener("pointerenter", () => {
        if (item.getAttribute("aria-pressed") === "true") getChart().focus(id);
      });
      item.addEventListener("pointerleave", () => getChart().revert(id));
      legend.appendChild(item);
    }
  }

  function chartLayout(target, options) {
    addHeading(target, options);
    const layout = document.createElement("div");
    const plot = document.createElement("div");
    plot.style.cssText = "width:100%;min-width:0";
    const side = options.legendPosition;
    let legend;
    if (options.showLegend && (side === "top" || side === "left")) {
      legend = document.createElement("div");
      legend.setAttribute("role", "group");
      legend.setAttribute("aria-label", "Chart legend");
      legend.dataset.position = side;
      legend.style.cssText = "display:flex;gap:3px;min-width:0;padding:4px;font:12px system-ui,sans-serif";
      if (side === "left") {
        layout.style.cssText = "display:grid;grid-template-columns:max-content minmax(0,1fr)";
        legend.style.cssText += ";flex-direction:column;align-self:center;max-width:min(28vw,150px);"
          + "overflow:auto";
        legend.style.maxHeight = `${options.height ?? 420}px`;
      } else {
        legend.style.cssText += ";flex-wrap:wrap;justify-content:center";
      }
      layout.appendChild(legend);
    }
    layout.appendChild(plot);
    target.appendChild(layout);
    return { plot, legend };
  }

  function positionBarLabels(plot, position) {
    const bars = new Map(Array.from(plot.querySelectorAll(".c3-bar"), mark => [mark.__data__?.index, mark]));
    for (const label of plot.querySelectorAll(".c3-chart-texts text.c3-text")) {
      const mark = bars.get(label.__data__?.index);
      if (!mark) continue;
      const { y, height } = mark.getBBox();
      const textHeight = label.getBBox().height;
      const labelY = position === "center" ? y + height / 2 + textHeight / 4
        : position === "bottom" ? y + height + textHeight
          : y - 4;
      if (label.getAttribute("y") !== String(labelY)) label.setAttribute("y", labelY);
    }
  }

  function drawScatterLabels(plot) {
    // C3's native data labels are limited to bar and line-based series.
    plot.querySelectorAll(".openlap-c3-scatter-value").forEach(label => label.remove());
    for (const circle of plot.querySelectorAll(".c3-circles circle.c3-circle")) {
      const point = circle.__data__;
      if (!Number.isFinite(point?.value)) continue;
      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("class", "openlap-c3-scatter-value");
      label.setAttribute("x", circle.getAttribute("cx"));
      label.setAttribute("y", Number(circle.getAttribute("cy")) - 7);
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("pointer-events", "none");
      label.textContent = Number(point.value.toPrecision(8));
      circle.parentElement.appendChild(label);
    }
  }

  function render(target, kind, rows, options) {
    if (!target || !types.has(kind) || !Array.isArray(rows) || !options) {
      throw new Error("The chart type, data and customization are required.");
    }
    const scatter = kind === "scatter";
    const circular = kind === "pie" || kind === "donut";
    const grouped = kind === "grouped-area" || kind === "stacked-area" || kind === "multi-line";
    if (!rows.every(row => row && (scatter
      ? Number.isFinite(row.x) && Number.isFinite(row.y)
        && (row.label == null || typeof row.label === "string")
        && (row.series == null || typeof row.series === "string")
      : typeof row.category === "string" && Number.isFinite(row.value)
        && (!grouped || typeof row.series === "string")))) {
      throw new Error("The chart needs finite numeric values and valid labels.");
    }

    destroy(target);
    if (!rows.length) {
      target.textContent = "No data to display.";
      return null;
    }
    const { data, categories, points, colorKeys } = scatter ? scatterData(rows) : categoricalData(rows, kind, options);
    const color = window.OpenLAPChartOptions.colorScale(options, palette);
    const colors = Object.fromEntries(Object.entries(colorKeys).map(([id, key], index) => [id, color(key, index)]));
    const { plot, legend } = chartLayout(target, options);
    const height = options.height ?? 420;
    const barPosition = kind === "bar" && options.showValues && options.valuesPosition;
    const showXAxis = options.showXAxis !== false;
    const showYAxis = options.showYAxis !== false;
    const showXAxisTitle = options.showXAxisTitle ?? showXAxis;
    const showYAxisTitle = options.showYAxisTitle ?? showYAxis;
    const colorNativeLegend = options.showLegend && !legend && options.useSeriesColors;
    const onRendered = () => {
      if (barPosition) positionBarLabels(plot, barPosition);
      if (scatter && options.showValues) drawScatterLabels(plot);
      if (colorNativeLegend) {
        for (const label of plot.querySelectorAll(".c3-legend-item text")) {
          label.style.fill = colors[label.__data__];
        }
      }
    };
    // Fill the legend before C3 measures its adjoining plot.
    if (legend) addLegend(legend, () => chart, data.names, colors, options.useSeriesColors);
    const chart = window.c3.generate({
      bindto: plot,
      size: { height },
      data: { ...data, colors, type: types.get(kind), order: null, labels: !circular && Boolean(options.showValues) },
      axis: {
        x: {
          show: !circular && (showXAxis || showXAxisTitle),
          type: scatter ? "indexed" : "category",
          categories,
          label: showXAxisTitle ? options.xAxisLabel : undefined,
          tick: {
            ...(scatter ? {} : { multiline: false, rotate: -35, culling: { max: 12 } }),
            format: showXAxis ? undefined : () => "",
          },
        },
        y: {
          show: !circular && (showYAxis || showYAxisTitle),
          label: showYAxisTitle ? options.yAxisLabel : undefined,
          tick: { format: showYAxis ? undefined : () => "" },
        },
      },
      grid: { y: { show: !circular && options.showGrid } },
      legend: {
        show: options.showLegend && !legend,
        position: options.legendPosition === "right" ? "right" : "bottom",
      },
      pie: { label: { show: options.showValues, format: value => Number(value.toPrecision(8)) } },
      donut: { label: { show: options.showValues, format: value => Number(value.toPrecision(8)) } },
      point: { show: scatter || kind === "line" || kind === "multi-line", r: scatter ? 4 : 3 },
      tooltip: { grouped: !scatter, contents: tooltip(data.names, categories, points) },
      transition: { duration: 0 },
      resize: { auto: typeof ResizeObserver === "undefined" },
      onrendered: onRendered,
    });
    plot.querySelector("svg")?.setAttribute("aria-label", options.chartTitle || `${kind} chart`);
    const clearValueLabelStyles = options.showValues
      ? window.OpenLAPChartOptions.styleValueLabels(plot, circular ? ".c3-chart-arcs .c3-chart-arc text"
        : scatter ? ".openlap-c3-scatter-value" : ".c3-chart-texts text.c3-text", options)
      : undefined;

    let observer;
    if (typeof ResizeObserver !== "undefined") {
      let width = plot.clientWidth;
      observer = new ResizeObserver(() => {
        if (!target.isConnected) {
          destroy(target);
          return;
        }
        const nextWidth = plot.clientWidth;
        if (nextWidth > 0 && nextWidth !== width) {
          width = nextWidth;
          chart.resize({ height });
        }
      });
      observer.observe(plot);
    }
    charts.set(target, { chart, observer, clearValueLabelStyles });
    return chart;
  }

  window.OpenLAPC3 = Object.freeze({ render, destroy });
}());
