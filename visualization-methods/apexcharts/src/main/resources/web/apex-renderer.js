(function () {
  "use strict";

  const chartTypes = new Map([
    ["bar", "bar"], ["line", "line"], ["area", "area"], ["pie", "pie"],
    ["donut", "donut"], ["scatter", "scatter"], ["grouped-area", "area"],
    ["stacked-area", "area"], ["multi-line", "line"],
  ]);
  const grouped = new Set(["grouped-area", "stacked-area", "multi-line"]);
  const palette = ["#1976d2", "#e66b19", "#368747", "#8054a6", "#c73e57", "#008883", "#ab7400", "#686cc3"];
  const activeCharts = new WeakMap();
  const htmlCharacters = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

  function escapeHtml(text) {
    return text.replace(/[&<>"']/g, (character) => htmlCharacters[character]);
  }

  function formatNumber(value) {
    return Number.isFinite(value) ? String(Number(value.toPrecision(8))) : "";
  }

  function scatterData(rows) {
    const groups = new Map();
    const hasGroups = rows.some((row) => row.series != null);
    for (const row of rows) {
      const key = row.series ?? null;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    }
    const scatterGroups = [...groups.values()];
    return {
      names: [...groups.keys()].map((name) => name ?? (hasGroups ? "Ungrouped" : "Observations")),
      colorKeys: [...groups.keys()],
      series: scatterGroups.map((points, index) => ({
        name: `series-${index + 1}`,
        data: points.map(({ x, y }) => ({ x, y })),
      })),
      point(seriesIndex, pointIndex) {
        const point = scatterGroups[seriesIndex]?.[pointIndex];
        if (!point) return [];
        const detail = [`X: ${formatNumber(point.x)}`, `Y: ${formatNumber(point.y)}`];
        if (hasGroups) detail.unshift(point.series ?? "Ungrouped");
        return [point.label, ...detail];
      },
    };
  }

  function categoryData(rows, kind) {
    const radial = kind === "pie" || kind === "donut";
    const isGrouped = grouped.has(kind);
    const labels = isGrouped ? [...new Set(rows.map((row) => row.category))] : rows.map((row) => row.category);
    // Keep ids internal so repeated labels stay distinct and Apex's HTML
    // paths never receive unescaped names from the analysis results.
    const categories = labels.map((_, index) => `category-${index + 1}`);
    const labelById = new Map(categories.map((id, index) => [id, labels[index]]));
    let names = ["Value"];
    let values = [rows.map((row) => row.value)];
    if (isGrouped) {
      const groups = new Map();
      for (const { category, series, value } of rows) {
        if (!groups.has(series)) groups.set(series, new Map());
        const group = groups.get(series);
        if (group.has(category)) throw new Error("Use one value per category and series.");
        group.set(category, value);
      }
      names = [...groups.keys()];
      values = [...groups.values()].map((group) => labels.map((label) => group.get(label) ?? null));
    }
    return {
      categories,
      labelById,
      names: radial ? labels : names,
      colorKeys: radial ? labels : isGrouped ? names : [null],
      series: radial ? values[0] : values.map((data, index) => ({ name: `series-${index + 1}`, data })),
      point(seriesIndex, pointIndex) {
        const index = radial ? seriesIndex : pointIndex;
        const value = values[radial ? 0 : seriesIndex]?.[index];
        if (!Number.isFinite(value)) return [];
        return [labels[index], ...(isGrouped ? [names[seriesIndex]] : []), formatNumber(value)];
      },
    };
  }

  function tooltip(lines) {
    const element = document.createElement("div");
    element.style.cssText = "padding:8px 12px;max-width:240px;white-space:normal;overflow-wrap:anywhere";
    for (const text of lines) {
      if (text == null || text === "") continue;
      const line = document.createElement(element.childElementCount ? "div" : "strong");
      line.textContent = text;
      element.appendChild(line);
    }
    return element;
  }

  function render(target, kind, rows, options) {
    const type = chartTypes.get(kind);
    if (!target || !type || !Array.isArray(rows)) throw new Error("A chart container, type and rows are required.");
    if (typeof window.ApexCharts !== "function") throw new Error("ApexCharts could not be loaded.");

    const radial = type === "pie" || type === "donut";
    const model = kind === "scatter" ? scatterData(rows) : categoryData(rows, kind);
    const color = window.OpenLAPChartOptions.colorScale(options, palette);
    const showXAxis = options.showXAxis !== false;
    const titlePosition = options.titlePosition || "center";
    const xaxis = {
      type: kind === "scatter" ? "numeric" : "category",
      title: { text: showXAxis ? options.xAxisLabel || undefined : undefined },
      tooltip: { enabled: false },
      axisBorder: { show: showXAxis },
      axisTicks: { show: showXAxis },
      labels: {
        show: showXAxis,
        showDuplicates: true,
        formatter: kind === "scatter" ? formatNumber : (id) => model.labelById.get(id) ?? "",
      },
    };
    if (model.categories && !radial) xaxis.categories = model.categories;
    const setup = {
      chart: {
        type,
        width: "100%",
        height: options.height,
        parentHeightOffset: 0,
        stacked: kind === "stacked-area",
        animations: { enabled: false },
        zoom: { enabled: false },
        toolbar: { show: false },
      },
      colors: model.colorKeys.map(color),
      series: model.series,
      title: { text: options.chartTitle || undefined, align: titlePosition },
      subtitle: { text: options.chartSubtitle || undefined, align: titlePosition },
      legend: {
        show: options.showLegend,
        position: options.legendPosition || "bottom",
        showForSingleSeries: true,
        formatter: (_, { seriesIndex }) => escapeHtml(model.names[seriesIndex] ?? ""),
      },
      dataLabels: {
        enabled: options.showValues,
        background: {
          enabled: Boolean(options.showValuesBackground),
          backgroundColor: "#ffffff",
          foreColor: "#212121",
          borderColor: "#c5c5c5",
          opacity: 0.95,
        },
        formatter: radial ? (_, { seriesIndex }) => formatNumber(model.series[seriesIndex]) : formatNumber,
      },
      stroke: { curve: "straight", width: type === "line" || type === "area" ? 2 : 0 },
      markers: { size: kind === "scatter" ? 5 : type === "line" ? 3 : 0 },
      grid: { show: options.showGrid },
      tooltip: {
        shared: false,
        intersect: kind === "scatter" || kind === "bar",
        // Apex 4.7 also has HTML sinks in its default tooltip. Escape its
        // fallback axis text separately from the SVG axis label formatter.
        x: { formatter: (id) => escapeHtml(model.labelById?.get(id) ?? formatNumber(id)) },
        custom: ({ seriesIndex, dataPointIndex }) => tooltip(model.point(seriesIndex, dataPointIndex)),
      },
      noData: { text: "No data to display" },
    };
    if (radial) {
      setup.labels = model.categories;
    } else {
      const showYAxis = options.showYAxis !== false;
      setup.xaxis = xaxis;
      setup.yaxis = {
        show: showYAxis,
        title: { text: showYAxis ? options.yAxisLabel || undefined : undefined },
        labels: { show: showYAxis, formatter: formatNumber },
      };
      if (kind === "bar" && options.valuesPosition) {
        setup.plotOptions = { bar: { dataLabels: { position: options.valuesPosition } } };
      }
      if (type === "area") setup.fill = { type: "solid", opacity: kind === "grouped-area" ? 0.25 : 0.45 };
    }

    activeCharts.get(target)?.destroy();
    const chart = new window.ApexCharts(target, setup);
    activeCharts.set(target, chart);
    return chart.render();
  }

  window.OpenLAPApex = Object.freeze({ render });
}());
