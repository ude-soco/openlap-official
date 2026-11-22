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
    const circular = kind === "pie" || kind === "donut";
    const grouped = kind === "grouped-area" || kind === "stacked-area" || kind === "multi-line";
    if (circular) {
      if (rows.some(row => row.value < 0) || rows.every(row => row.value === 0)) {
        throw new Error("Pie and donut charts need non-negative values and at least one positive value.");
      }
      rows.forEach(({ category, value }, index) => {
        const id = `slice_${index}`;
        names[id] = category;
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
        columns.push([id, ...categories.map((_, index) => values.get(index) ?? null)]);
      }
    } else {
      categories.push(...rows.map(row => row.category));
      names.value = options.yAxisLabel || "Value";
      columns.push(["value", ...rows.map(row => row.value)]);
    }
    const data = { columns, names };
    if (kind === "stacked-area") data.groups = [Object.keys(names)];
    return { data, categories };
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
    const xs = {};
    const points = new Map();
    for (const [series, group] of groups) {
      const id = `series_${points.size}`;
      const xId = `x_${points.size}`;
      group.sort((first, second) => first.x - second.x);
      points.set(id, group);
      names[id] = series ?? (hasGroups ? "Ungrouped" : "Observations");
      xs[id] = xId;
      columns.push([xId, ...group.map(point => point.x)], [id, ...group.map(point => point.y)]);
    }
    return { data: { columns, names, xs, xSort: false }, points };
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
      previous.chart.destroy();
      charts.delete(target);
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
    const { data, categories, points } = scatter ? scatterData(rows) : categoricalData(rows, kind, options);
    const color = typeof options.seriesColor === "string" && /^#[a-f0-9]{6}$/i.test(options.seriesColor)
      ? options.seriesColor.toLowerCase() : palette[0];
    const height = options.height ?? 420;
    const chart = window.c3.generate({
      bindto: target,
      size: { height },
      title: options.chartTitle ? { text: options.chartTitle, padding: { top: 8, bottom: 8 } } : undefined,
      color: { pattern: [color, ...palette.filter(entry => entry !== color)] },
      data: { ...data, type: types.get(kind), order: null, labels: !circular && Boolean(options.showValues) },
      axis: {
        x: {
          show: !circular,
          type: scatter ? "indexed" : "category",
          categories,
          label: options.xAxisLabel,
          tick: scatter ? undefined : { multiline: false, rotate: -35, culling: { max: 12 } },
        },
        y: { show: !circular, label: options.yAxisLabel },
      },
      grid: { y: { show: !circular && options.showGrid } },
      legend: { show: options.showLegend },
      pie: { label: { show: options.showValues, format: value => Number(value.toPrecision(8)) } },
      donut: { label: { show: options.showValues, format: value => Number(value.toPrecision(8)) } },
      point: { show: scatter || kind === "line" || kind === "multi-line", r: scatter ? 4 : 3 },
      tooltip: { grouped: !scatter, contents: tooltip(data.names, categories, points) },
      transition: { duration: 0 },
      resize: { auto: typeof ResizeObserver === "undefined" },
    });
    target.querySelector("svg")?.setAttribute("aria-label", options.chartTitle || `${kind} chart`);

    let observer;
    if (typeof ResizeObserver !== "undefined") {
      let width = target.clientWidth;
      observer = new ResizeObserver(() => {
        if (!target.isConnected) {
          destroy(target);
          return;
        }
        const nextWidth = target.clientWidth;
        if (nextWidth > 0 && nextWidth !== width) {
          width = nextWidth;
          chart.resize({ height });
        }
      });
      observer.observe(target);
    }
    charts.set(target, { chart, observer });
    return chart;
  }

  window.OpenLAPC3 = Object.freeze({ render, destroy });
}());
