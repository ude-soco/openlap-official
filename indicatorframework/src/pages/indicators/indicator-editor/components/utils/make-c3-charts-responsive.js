// The reviewed historical C3 generators declare the same fixed `size.width`
// expression for live and saved charts. Omit only that outer size setting so
// C3 measures its container. Preserve chart height/data, and reserve readable
// tick-label space for dense category axes using documented C3 options.
const FIXED_C3_SIZE_WIDTH =
  /\bsize\s*:\s*\{\s*width\s*:\s*(?:\(\s*width_\d+\s*-\s*20\s*\)|\d+(?:\.\d+)?)\s*,\s*(?=height\s*:)/;
const HISTORICAL_GENERATOR =
  /(\b(?:var|let|const)\s+chart_\d+\s*=\s*c3\.generate)\(\s*(\{[\s\S]*\})\s*\);\s*$/;

// Public C3 options reserve label space above the bottom legend. Keep explicit
// tick choices supplied by a generator; only qualify the historical call shape.
function readableCategoryAxis(options) {
  if (
    options.axis?.x?.type === "category" &&
    options.axis.x.categories?.length > 5
  ) {
    options.axis.x.tick = Object.assign(
      { rotate: -45, multiline: false, culling: false },
      options.axis.x.tick,
    );
    options.axis.x.height = Math.max(options.axis.x.height || 0, 80);
  }
  return options;
}

export function makeC3ChartsResponsive(script) {
  if (typeof script !== "string" || !script.includes("c3.generate("))
    return script;
  return script
    .replace(FIXED_C3_SIZE_WIDTH, "size: { ")
    .replace(
      HISTORICAL_GENERATOR,
      (_, generate, options) =>
        `${generate}((${readableCategoryAxis.toString()})(${options}));`,
    );
}
