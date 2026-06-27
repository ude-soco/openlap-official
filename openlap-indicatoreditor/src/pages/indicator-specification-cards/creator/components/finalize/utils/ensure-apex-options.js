// Defensive normalization of a chart's ApexCharts options (crash fix).
//
// Why this exists: drafts may reach Finalize with partial chart options; chart
// components must normalize options before reading nested Apex fields.
//
// When continuing an INCOMPLETE draft, the autosaved `visRef.data.options` may be
// missing or partial (a chart was selected, but Finalize was never reached, so the
// full options object was never built). The chart components and their effects
// assume nested containers like `options.xaxis.title` exist (e.g.
// `...p.options.xaxis.title`), which throws on a partial object.
//
// This helper returns a NEW options object (never mutates the input) that
// preserves every provided value but guarantees the nested containers the
// renderers touch. For complete options (saved ISCs) the result is value-
// equivalent, so existing charts render exactly as before.

// Ensure an axis is a safe object with a `title` container. Multi-axis configs
// (yaxis as an array) are already complete — leave them untouched.
const normalizeAxis = (axis) => {
  if (Array.isArray(axis)) return axis;
  const a = axis && typeof axis === "object" ? axis : {};
  return { ...a, title: { text: "", ...(a.title || {}) } };
};

export const ensureApexOptions = (options) => {
  const o = options && typeof options === "object" ? options : {};
  return {
    ...o,
    chart: { ...(o.chart || {}) },
    title: { text: "", ...(o.title || {}) },
    subtitle: { text: "", ...(o.subtitle || {}) },
    legend: { ...(o.legend || {}) },
    dataLabels: { ...(o.dataLabels || {}) },
    plotOptions: { ...(o.plotOptions || {}) },
    colors: Array.isArray(o.colors) ? o.colors : [],
    xaxis: normalizeAxis(o.xaxis),
    yaxis: normalizeAxis(o.yaxis),
  };
};
