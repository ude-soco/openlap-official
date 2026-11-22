(function () {
  "use strict";

  const kinds = new Set(["bar", "line", "area", "pie", "donut", "scatter", "grouped-area", "stacked-area", "multi-line"]);
  const grouped = new Set(["grouped-area", "stacked-area", "multi-line"]);
  const palette = ["#1976d2", "#c35b26", "#17816b", "#8c52aa", "#bd455f", "#76641f", "#5368b3"];
  const charts = new WeakMap();
  const hoverCategory = "%{customdata[0]}<br>%{customdata[1]}: %{y}<extra></extra>";

  function plainText(value) {
    // Plotly parses mini-HTML in SVG text. Encode its markup delimiters and
    // keep quotes literal, since it does not decode quote entities there.
    return String(value).replace(/[&<>]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[character]);
  }

  function formatNumber(value) {
    return Number.isFinite(value) ? String(Number(value.toPrecision(8))) : "";
  }

  function translucent(color, opacity) {
    const components = [1, 3, 5].map(index => Number.parseInt(color.slice(index, index + 2), 16));
    return `rgba(${components.join(",")},${opacity})`;
  }

  function scatterTraces(rows, options, colorFor, textfont) {
    const groups = new Map();
    const hasGroups = rows.some(row => row.series != null);
    for (const row of rows) {
      const key = row.series ?? null;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    }
    return [...groups].map(([group, points], index) => ({
      type: "scatter",
      mode: options.showValues ? "markers+text" : "markers",
      name: plainText(group ?? (hasGroups ? "Ungrouped" : "Observations")),
      x: points.map(point => point.x),
      y: points.map(point => point.y),
      marker: { color: colorFor(group, index), size: 8 },
      text: options.showValues ? points.map(point => formatNumber(point.y)) : undefined,
      textposition: "top center",
      textfont,
      customdata: points.map(point => [point.label ? plainText(point.label) + "<br>" : ""]),
      hovertemplate: "%{customdata[0]}X: %{x}<br>Y: %{y}<extra></extra>",
    }));
  }

  function categories(rows, kind, valueName) {
    if (!grouped.has(kind)) {
      return { labels: rows.map(row => row.category), series: [[valueName, rows.map(row => row.value)]] };
    }
    const labels = [...new Set(rows.map(row => row.category))];
    const groups = new Map();
    for (const row of rows) {
      if (!groups.has(row.series)) groups.set(row.series, new Map());
      const series = groups.get(row.series);
      if (series.has(row.category)) throw new Error("Use one value per category and series.");
      series.set(row.category, row.value);
    }
    return { labels, series: [...groups].map(([name, values]) => [name, labels.map(label => values.get(label) ?? null)]) };
  }

  function categoryTrace(name, values, labels, kind, options, color, textfont) {
    const escapedName = plainText(name);
    const bar = kind === "bar";
    const stacked = kind === "stacked-area";
    const area = kind === "area" || kind === "grouped-area" || stacked;
    const barLabelPosition = { top: "end", center: "middle", bottom: "start" }[options.valuesPosition];
    return {
      type: bar ? "bar" : "scatter",
      mode: bar ? undefined : options.showValues ? "lines+markers+text" : area ? "lines" : "lines+markers",
      name: escapedName,
      // Numeric positions keep repeated display labels as separate observations.
      x: labels.map((_, index) => index),
      y: values,
      marker: { color, size: 6 },
      line: bar ? undefined : { color, width: 2 },
      stackgroup: stacked ? "values" : undefined,
      fill: area && !stacked ? "tozeroy" : undefined,
      fillcolor: area ? translucent(color, kind === "grouped-area" ? 0.24 : 0.42) : undefined,
      connectgaps: bar ? undefined : false,
      text: options.showValues ? values.map(formatNumber) : undefined,
      textfont,
      ...(bar ? {
        textposition: options.showValues ? barLabelPosition ? "inside" : "auto" : "none",
        insidetextanchor: barLabelPosition,
        insidetextfont: textfont,
        outsidetextfont: textfont,
      } : { textposition: "top center" }),
      customdata: labels.map(label => [plainText(label), escapedName]),
      // Plotly needs a zero baseline where a stacked series has no observation.
      // Keep those positions out of numeric labels and flag them in tooltips.
      hovertemplate: stacked ? values.map(value => value == null
        ? "%{customdata[0]}<br>%{customdata[1]}: No observation<extra></extra>" : hoverCategory) : hoverCategory,
    };
  }

  function pieTrace(rows, kind, options, colorFor, textfont) {
    const values = rows.map(row => row.value);
    const total = values.reduce((sum, value) => sum + value, 0);
    if (!Number.isFinite(total) || total <= 0 || values.some(value => value < 0)) {
      throw new Error("Pie and donut charts need non-negative values and a finite positive total.");
    }
    const originals = rows.map(row => plainText(row.category));
    const occupied = new Set(originals);
    const counts = new Map();
    const labels = originals.map(label => {
      // Plotly adds slices with identical labels together. Disambiguate those
      // slices in the legend while retaining the original label on hover.
      let next = counts.get(label) || 1;
      if (next === 1) {
        counts.set(label, 2);
        return label;
      }
      let distinct;
      do distinct = `${label} (${next++})`; while (occupied.has(distinct));
      counts.set(label, next);
      occupied.add(distinct);
      return distinct;
    });
    return {
      type: "pie", values, labels, hovertext: originals, sort: false,
      marker: { colors: rows.map((row, index) => colorFor(row.category, index)) },
      hole: kind === "donut" ? 0.48 : 0,
      textinfo: options.showValues ? "value" : "none",
      textfont,
      insidetextfont: textfont,
      outsidetextfont: textfont,
      hovertemplate: "%{hovertext}<br>Value: %{value}<extra></extra>",
    };
  }

  function axis(title, showGrid, showLabels, showTitle) {
    return { title: { text: showTitle === false ? "" : plainText(title || "") }, showgrid: showGrid,
      showticklabels: showLabels !== false, automargin: true, zeroline: false };
  }

  function legend(position) {
    const boxes = {
      top: { orientation: "h", x: 0.5, xanchor: "center", y: 1.02, yanchor: "bottom" },
      bottom: { orientation: "h", x: 0.5, xanchor: "center", y: 0, yref: "container", yanchor: "bottom" },
      left: { orientation: "v", x: -0.04, xanchor: "right", y: 0.5, yanchor: "middle" },
      right: { orientation: "v", x: 1.04, xanchor: "left", y: 0.5, yanchor: "middle" },
    };
    return { ...(boxes[position] ?? boxes.bottom), traceorder: "normal" };
  }

  function colorLegendLabels(target) {
    // Plotly has one legend font color. Use each rendered mark's color for its own label.
    for (const label of target.querySelectorAll(".legend .traces .legendtext")) {
      const mark = label.parentElement.querySelector(".legendsymbols path");
      const line = label.parentElement.querySelector(".legendlines path");
      const color = mark?.style.fill || line?.style.stroke;
      if (color) label.style.fill = color;
    }
  }

  function heading(options) {
    const { chartTitle, chartSubtitle } = options;
    const align = ["left", "right"].includes(options.titlePosition) ? options.titlePosition : "center";
    return {
      text: plainText(chartTitle || chartSubtitle || ""),
      font: chartTitle ? undefined : { size: 14, color: "#52606d" },
      subtitle: chartTitle && chartSubtitle ? { text: plainText(chartSubtitle), font: { size: 14, color: "#52606d" } } : undefined,
      x: { left: 0, center: 0.5, right: 1 }[align],
      xanchor: align,
      pad: { l: 12, r: 12 },
      automargin: true,
    };
  }

  async function render(target, kind, rows, options) {
    if (!target || !kinds.has(kind) || !Array.isArray(rows) || !options) {
      throw new Error("The chart container, type, data and customization are required.");
    }
    const plotly = window.Plotly;
    if (typeof plotly?.newPlot !== "function") throw new Error("Plotly could not be loaded.");
    const scatter = kind === "scatter";
    const radial = kind === "pie" || kind === "donut";
    if (!rows.every(row => row && (scatter
      ? Number.isFinite(row.x) && Number.isFinite(row.y)
        && (row.label == null || typeof row.label === "string") && (row.series == null || typeof row.series === "string")
      : Number.isFinite(row.value) && typeof row.category === "string"
        && (!grouped.has(kind) || typeof row.series === "string")))) {
      throw new Error("The chart needs finite numerical values and valid labels.");
    }
    charts.get(target)?.observer?.disconnect();
    charts.get(target)?.clearBackgrounds?.();
    if (charts.has(target)) plotly.purge(target);
    if (!rows.length) {
      charts.delete(target);
      target.textContent = "No data to display.";
      return;
    }

    const firstColor = typeof options.seriesColor === "string" && /^#[a-f0-9]{6}$/i.test(options.seriesColor)
      ? options.seriesColor.toLowerCase() : palette[0];
    const colors = [firstColor, ...palette.filter(color => color !== firstColor)];
    const colorFor = window.OpenLAPChartOptions?.colorScale(options, palette)
      ?? ((_, index) => colors[index % colors.length]);
    const textfont = { color: window.OpenLAPChartOptions.valueLabelColors(options).text };
    const height = options.height ?? 420;
    const legendPosition = options.legendPosition || "bottom";
    const titleMargin = options.chartTitle && options.chartSubtitle ? 72
      : options.chartTitle || options.chartSubtitle ? 52 : 24;
    const layout = {
      title: heading(options),
      height,
      autosize: true,
      margin: { t: titleMargin, r: 18, b: options.showLegend && legendPosition === "bottom" ? 86 : 50, l: radial ? 18 : 52 },
      showlegend: options.showLegend,
      legend: legend(legendPosition),
      font: { family: "system-ui, sans-serif", color: "#303b48" },
      hovermode: "closest",
      paper_bgcolor: "transparent",
      plot_bgcolor: "transparent",
    };
    let traces;
    if (radial) {
      traces = [pieTrace(rows, kind, options, colorFor, textfont)];
    } else {
      layout.xaxis = axis(options.xAxisLabel, options.showGrid, options.showXAxis, options.showXAxisTitle);
      layout.yaxis = axis(options.yAxisLabel, options.showGrid, options.showYAxis, options.showYAxisTitle);
      if (scatter) {
        traces = scatterTraces(rows, options, colorFor, textfont);
      } else {
        const { labels, series } = categories(rows, kind, options.yAxisLabel || "Value");
        const tickStride = Math.max(1, Math.ceil(labels.length / 12));
        const ticks = labels.map((_, index) => index).filter(index => index % tickStride === 0);
        Object.assign(layout.xaxis, {
          type: "linear", range: [-0.5, labels.length - 0.5], tickmode: "array",
          tickvals: ticks, ticktext: ticks.map(index => plainText(labels[index])),
          tickangle: ticks.length > 6 ? -35 : "auto",
        });
        traces = series.map(([name, values], index) => categoryTrace(name, values, labels, kind,
          options, colorFor(grouped.has(kind) ? name : null, index), textfont));
      }
    }

    target.style.width = "100%";
    target.style.height = `${height}px`;
    target.setAttribute("role", "group");
    target.setAttribute("aria-label", options.chartTitle || options.chartSubtitle || `${kind.replaceAll("-", " ")} chart`);
    const state = {};
    charts.set(target, state);
    await plotly.newPlot(target, traces, layout, {
      displayModeBar: false, displaylogo: false, showLink: false, scrollZoom: false,
      responsive: typeof ResizeObserver === "undefined",
    });
    if (charts.get(target) !== state) return;
    if (options.showLegend && options.useSeriesColors) {
      colorLegendLabels(target);
      target.on("plotly_afterplot", () => colorLegendLabels(target));
    }
    if (options.showValues && options.showValuesBackground) {
      state.clearBackgrounds = window.OpenLAPChartOptions.valueBackgrounds(target,
        ".barlayer text.bartext, .scatterlayer .textpoint text, .pielayer .slicetext text", options);
    }
    if (typeof ResizeObserver !== "undefined") {
      let width = target.clientWidth;
      state.observer = new ResizeObserver(() => {
        if (!target.isConnected) {
          state.observer.disconnect();
          state.clearBackgrounds?.();
          return;
        }
        const nextWidth = target.clientWidth;
        if (nextWidth > 0 && nextWidth !== width) {
          width = nextWidth;
          void plotly.Plots.resize(target);
        }
      });
      state.observer.observe(target);
    }
  }

  window.OpenLAPPlotly = Object.freeze({ render });
}());
