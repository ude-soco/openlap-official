import React from "react";
import { createRoot } from "react-dom/client";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const grouped = new Set(["grouped-area", "stacked-area", "multi-line"]);
const radial = new Set(["pie", "donut"]);
const names = new Map([
  ["bar", "Bar chart"], ["line", "Line chart"], ["area", "Area chart"],
  ["pie", "Pie chart"], ["donut", "Donut chart"], ["scatter", "Scatter plot"],
  ["grouped-area", "Grouped area chart"], ["stacked-area", "Stacked area chart"],
  ["multi-line", "Multi-line chart"],
]);
const palette = ["#b2458b", "#168370", "#b85417", "#6253b4", "#7c6417", "#55744a", "#b64550"];
const roots = new WeakMap();

function formatNumber(value) {
  return Number.isFinite(value) ? String(Number(value.toPrecision(8))) : "";
}

function categoricalData(rows, kind) {
  if (!grouped.has(kind)) {
    return {
      data: rows.map((row, position) => ({ ...row, position })),
      series: [{ key: "value", name: "Value" }],
    };
  }

  const categories = new Map();
  const series = new Map();
  for (const { category, series: name, value } of rows) {
    if (!categories.has(category)) categories.set(category, { category, position: categories.size });
    if (!series.has(name)) series.set(name, { key: `series${series.size}`, name });
    const row = categories.get(category);
    const { key } = series.get(name);
    if (Object.hasOwn(row, key)) throw new Error("Use one value per category and series.");
    row[key] = value;
  }

  const entries = [...series.values()];
  return {
    data: [...categories.values()].map((row) => {
      for (const { key } of entries) {
        if (!Object.hasOwn(row, key)) row[key] = null;
      }
      return row;
    }),
    series: entries,
  };
}

function scatterData(rows) {
  const groups = new Map();
  const hasGroups = rows.some(({ series }) => series != null);
  for (const point of rows) {
    const key = point.series ?? null;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(point);
  }
  return [...groups].map(([key, points]) => ({
    name: key ?? (hasGroups ? "Ungrouped" : "Observations"), points,
  }));
}

function ChartTooltip({ active, payload, kind }) {
  const first = payload?.[0];
  if (!active || !first) return null;
  const row = first.payload;
  if (!row) return null;
  let heading = row.category;
  let values = payload.filter(({ value }) => Number.isFinite(value))
    .map(({ name, value }) => [name, value]);
  if (kind === "scatter") {
    heading = row.label || row.series;
    values = [["X", row.x], ["Y", row.y]];
  } else if (radial.has(kind)) {
    values = [["Value", row.value]];
  }
  return (
    <div style={{ padding: "8px 12px", maxWidth: 250, overflowWrap: "anywhere", background: "#fff",
      border: "1px solid #c7c7c7", borderRadius: 4, fontSize: 14 }}>
      {heading && <strong>{heading}</strong>}
      {values.map(([name, value], index) => <div key={index}>{name}: {formatNumber(value)}</div>)}
    </div>
  );
}

function sliceChart(kind, rows, colors, options) {
  const data = rows.map((row, index) => ({ ...row, fill: colors[index % colors.length] }));
  return (
    <PieChart accessibilityLayer>
      <Tooltip content={<ChartTooltip kind={kind} />} />
      {options.showLegend && <Legend />}
      <Pie data={data} dataKey="value" nameKey="category" outerRadius="80%"
        innerRadius={kind === "donut" ? "45%" : 0} isAnimationActive={false}
        label={options.showValues ? ({ value }) => formatNumber(value) : false} />
    </PieChart>
  );
}

function scatterChart(rows, colors, options) {
  const data = scatterData(rows);
  return (
    <ScatterChart accessibilityLayer margin={{ top: 20, right: 20, bottom: 12, left: 12 }}>
      {options.showGrid && <CartesianGrid vertical={false} />}
      <XAxis type="number" dataKey="x" tickFormatter={formatNumber} tickMargin={8}
        height={options.xAxisLabel ? 50 : 32}
        label={{ value: options.xAxisLabel, position: "insideBottom", offset: 0 }} />
      <YAxis type="number" dataKey="y" tickFormatter={formatNumber} tickMargin={8}
        width={options.yAxisLabel ? 64 : 48}
        label={{ value: options.yAxisLabel, angle: -90, position: "insideLeft" }} />
      <Tooltip content={<ChartTooltip kind="scatter" />} />
      {options.showLegend && <Legend />}
      {data.map(({ name, points }, index) => (
        <Scatter key={index} name={name} data={points} fill={colors[index % colors.length]} isAnimationActive={false}>
          {options.showValues && <LabelList dataKey="y" position="top" formatter={formatNumber} />}
        </Scatter>
      ))}
    </ScatterChart>
  );
}

function categoryChart(kind, rows, colors, options) {
  const { data, series } = categoricalData(rows, kind);
  const area = kind === "area" || kind === "grouped-area" || kind === "stacked-area";
  const Series = kind === "bar" ? Bar : area ? Area : Line;
  const nameOf = (position) => data[position]?.category || "";
  return (
    <ComposedChart data={data} accessibilityLayer stackOffset="sign"
      margin={{ top: 22, right: 20, bottom: 16, left: 12 }}>
      {options.showGrid && <CartesianGrid vertical={false} />}
      <XAxis type="category" dataKey="position" tickFormatter={nameOf} tickMargin={8}
        height={options.xAxisLabel ? 60 : 44} textAnchor="end" angle={-22} minTickGap={10}
        label={{ value: options.xAxisLabel, position: "insideBottom", offset: 0 }} />
      <YAxis type="number" tickFormatter={formatNumber} tickMargin={8} width={options.yAxisLabel ? 64 : 48}
        label={{ value: options.yAxisLabel, angle: -90, position: "insideLeft" }} />
      <Tooltip content={<ChartTooltip kind={kind} />} />
      {options.showLegend && <Legend />}
      {series.map(({ key, name }, index) => {
        const color = colors[index % colors.length];
        const styling = area ? {
          fillOpacity: kind === "grouped-area" ? 0.25 : 0.42,
          stackId: kind === "stacked-area" ? "total" : undefined,
        } : {};
        return (
          <Series key={key} type="linear" dataKey={key} name={name} fill={color} stroke={color}
            strokeWidth={kind === "bar" ? 0 : 2} connectNulls={false} isAnimationActive={false} {...styling}>
            {options.showValues && <LabelList dataKey={key} position="top" formatter={formatNumber} />}
          </Series>
        );
      })}
    </ComposedChart>
  );
}

function Chart({ kind, rows, options }) {
  const primary = /^#[\da-f]{6}$/i.test(options.seriesColor || "") ? options.seriesColor.toLowerCase() : "#1976d2";
  const colors = [primary, ...palette.filter((color) => color !== primary)];
  const chart = radial.has(kind) ? sliceChart(kind, rows, colors, options)
    : kind === "scatter" ? scatterChart(rows, colors, options) : categoryChart(kind, rows, colors, options);
  return (
    <div role="group" aria-label={options.chartTitle || names.get(kind)} style={{ width: "100%", minWidth: 0 }}>
      {options.chartTitle && <div style={{ textAlign: "center", overflowWrap: "anywhere", fontWeight: 600 }}>
        {options.chartTitle}
      </div>}
      <ResponsiveContainer width="100%" height={options.height ?? 420} minWidth={0}>
        {chart}
      </ResponsiveContainer>
    </div>
  );
}

function render(target, kind, rows, options = {}) {
  if (!target || !names.has(kind) || !Array.isArray(rows)) {
    throw new Error("A chart container, type and rows are required.");
  }
  let root = roots.get(target);
  if (!root) {
    root = createRoot(target);
    roots.set(target, root);
  }
  root.render(rows.length ? <Chart kind={kind} rows={rows} options={options} /> : <p>No data to display.</p>);
}

function destroy(target) {
  roots.get(target)?.unmount();
  roots.delete(target);
}

window.OpenLAPRecharts = Object.freeze({ render, destroy });
