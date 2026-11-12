import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { makeApexChartsResponsive } from "./make-apex-charts-responsive.js";

const optionsFrom = (source) => vm.runInNewContext(`${source}; options`);

for (const width of ["500", "500.0", "640.25", "5.0E2", "5e+2", '"500.0"', "'640.0'"]) {
  test(`numeric chart width ${width} becomes responsive without breaking JavaScript`, () => {
    const source = `var options = { chart: { height: 500.0, width: ${width} }, series: [{ data: [12, 7] }] };`;
    const result = makeApexChartsResponsive(source);
    const options = optionsFrom(result);
    assert.equal(Object.hasOwn(options.chart, "width"), false);
    assert.equal(options.chart.height, 500);
    assert.equal(JSON.stringify(options.series), '[{"data":[12,7]}]');
  });
}

test("saved scatter width leaves its following zoom setting intact", () => {
  const result = makeApexChartsResponsive(
    "var options = { chart: { type: 'scatter', width: 500.0, zoom: { enabled: true } } };",
  );
  const options = optionsFrom(result);
  assert.equal(Object.hasOwn(options.chart, "width"), false);
  assert.equal(options.chart.zoom.enabled, true);
});

test("Pie responsive breakpoint keeps its own width", () => {
  const result = makeApexChartsResponsive(
    "var options = { chart: { type: 'pie', toolbar: {}, width: 500.0 }, responsive: [{ breakpoint: 480, options: { chart: { width: 200 } } }] };",
  );
  const options = optionsFrom(result);
  assert.equal(Object.hasOwn(options.chart, "width"), false);
  assert.equal(options.responsive[0].options.chart.width, 200);
});

for (const width of ['"100%"', "'500px'", "500 + 20", "5e2px", "500.0extra", '"500.0\'']) {
  test(`does not remove part of unsupported width ${width}`, () => {
    const source = `var options = { chart: { height: 500, width: ${width} } };`;
    assert.equal(makeApexChartsResponsive(source), source);
  });
}

test("C3 generated code is unchanged", () => {
  const source = "var chart = c3.generate({ bindto: '#chartdiv_1', size: { height: 500 }, data: { columns: [['items', 12, 7]] } });";
  assert.equal(makeApexChartsResponsive(source), source);
});

test("missing script data remains unchanged", () => {
  for (const value of [undefined, null, {}]) {
    assert.equal(makeApexChartsResponsive(value), value);
  }
});
