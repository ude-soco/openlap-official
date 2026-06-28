// TEMPORARY, opt-in, fail-safe frontend fallback for ApexCharts responsiveness.
//
// The ApexCharts visualizer plugin bakes a FIXED `chart.width` into its generated
// options (e.g. `chart: { type:'bar', toolbar:{…}, height: 500, width: 500 }`).
// ApexCharts honours a fixed numeric width instead of filling its container, so
// such charts render fixed-width. Unlike the C3 plugin (fixed at the plugin level),
// the ApexCharts plugin source is not available in this workspace to fix, so we
// neutralize the fixed `chart.width` here so the LIVE PREVIEW fills its container
// (ApexCharts defaults to 100% width when `width` is unset, and resizes with it).
//
// REMOVE THIS once the ApexCharts visualizer plugin omits the fixed width
// (mirroring the C3 plugin fix). It is applied ONLY in ChartPreview's responsive
// (editor live-preview) mode — saved/dashboard/ICC rendering is untouched.
//
// Robustness: the generated `chart.width` is always comma-prefixed (`, width: N`),
// while the Pie/Donut `responsive` breakpoint uses a brace-prefixed `{ width: 200 }`.
// Matching only the FIRST `, width: N` (non-global) removes the fixed chart width
// across every chart shape — Area/Bar/Line (`…height: H, width: W}`),
// Scatter (`…width: W, zoom:`), Pie/Donut (`…toolbar:{…}, width: W}`) — and never
// touches the responsive block. It also no-ops on C3 output (no `, width: N`).
// Fail-safe: if the pattern is absent, the script is returned unchanged. Never
// mutates the input (String.replace returns a new string).
const APEX_FIXED_WIDTH_RE = /,\s*width:\s*["']?\d+["']?/;

export const makeApexChartsResponsive = (scriptData) => {
  if (typeof scriptData !== "string") return scriptData;
  return scriptData.replace(APEX_FIXED_WIDTH_RE, "");
};
