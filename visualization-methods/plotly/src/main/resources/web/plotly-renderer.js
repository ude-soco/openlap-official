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

  function colorAt(colors, index) {
    return colors[index % colors.length];
  }

  function translucent(color, opacity) {
    const components = [1, 3, 5].map(index => Number.parseInt(color.slice(index, index + 2), 16));
    return `rgba(${components.join(",")},${opacity})`;
  }

  function scatterTraces(rows, options, colors) {
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
      marker: { color: colorAt(colors, index), size: 8 },
      text: options.showValues ? points.map(point => formatNumber(point.y)) : undefined,
      textposition: "top center",
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

  function categoryTrace(name, values, labels, kind, showValues, color) {
    const escapedName = plainText(name);
    const bar = kind === "bar";
    const stacked = kind === "stacked-area";
    const area = kind === "area" || kind === "grouped-area" || stacked;
    return {
      type: bar ? "bar" : "scatter",
      mode: bar ? undefined : showValues ? "lines+markers+text" : area ? "lines" : "lines+markers",
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
      text: showValues ? values.map(formatNumber) : undefined,
      textposition: bar ? showValues ? "auto" : "none" : "top center",
      customdata: labels.map(label => [plainText(label), escapedName]),
      // Plotly needs a zero baseline where a stacked series has no observation.
      // Keep those positions out of numeric labels and flag them in tooltips.
      hovertemplate: stacked ? values.map(value => value == null
        ? "%{customdata[0]}<br>%{customdata[1]}: No observation<extra></extra>" : hoverCategory) : hoverCategory,
    };
  }

  function pieTrace(rows, kind, options, colors) {
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
      marker: { colors: rows.map((_, index) => colorAt(colors, index)) },
      hole: kind === "donut" ? 0.48 : 0,
      textinfo: options.showValues ? "value" : "none",
      hovertemplate: "%{hovertext}<br>Value: %{value}<extra></extra>",
    };
  }

  function axis(title, showGrid) {
    return { title: { text: plainText(title || "") }, showgrid: showGrid, automargin: true, zeroline: false };
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
    if (charts.has(target)) plotly.purge(target);
    if (!rows.length) {
      charts.delete(target);
      target.textContent = "No data to display.";
      return;
    }

    const firstColor = typeof options.seriesColor === "string" && /^#[a-f0-9]{6}$/i.test(options.seriesColor)
      ? options.seriesColor.toLowerCase() : palette[0];
    const colors = [firstColor, ...palette.filter(color => color !== firstColor)];
    const height = options.height ?? 420;
    const layout = {
      title: { text: plainText(options.chartTitle || ""), x: 0.5, xanchor: "center", automargin: true },
      height,
      autosize: true,
      margin: { t: options.chartTitle ? 52 : 24, r: 18, b: 50, l: radial ? 18 : 52 },
      showlegend: options.showLegend,
      legend: { orientation: "h", xanchor: "center", x: 0.5, traceorder: "normal" },
      font: { family: "system-ui, sans-serif", color: "#303b48" },
      hovermode: "closest",
      paper_bgcolor: "transparent",
      plot_bgcolor: "transparent",
    };
    let traces;
    if (radial) {
      traces = [pieTrace(rows, kind, options, colors)];
    } else {
      layout.xaxis = axis(options.xAxisLabel, options.showGrid);
      layout.yaxis = axis(options.yAxisLabel, options.showGrid);
      if (scatter) {
        traces = scatterTraces(rows, options, colors);
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
          options.showValues, colorAt(colors, index)));
      }
    }

    target.style.width = "100%";
    target.style.height = `${height}px`;
    target.setAttribute("role", "group");
    target.setAttribute("aria-label", options.chartTitle || `${kind.replaceAll("-", " ")} chart`);
    const state = {};
    charts.set(target, state);
    await plotly.newPlot(target, traces, layout, {
      displayModeBar: false, displaylogo: false, showLink: false, scrollZoom: false,
      responsive: typeof ResizeObserver === "undefined",
    });
    if (typeof ResizeObserver !== "undefined" && charts.get(target) === state) {
      let width = target.clientWidth;
      state.observer = new ResizeObserver(() => {
        if (!target.isConnected) {
          state.observer.disconnect();
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
