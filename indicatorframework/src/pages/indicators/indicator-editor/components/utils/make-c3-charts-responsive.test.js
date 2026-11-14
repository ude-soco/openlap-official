import test from "node:test";
import assert from "node:assert/strict";
import { makeC3ChartsResponsive } from "./make-c3-charts-responsive.js";

test("historical saved C3 width expressions yield to the container without changing height or data", () => {
  const original =
    "var width_1794659068581=500.0;var height_1794659068581=500.0;var chart_1794659068581=c3.generate({bindto:'#chartdiv_1794659068581',size:{width:(width_1794659068581 - 20),height:(height_1794659068581 - 20)},data:{rows:[['Access','Students'],[860,182],[0,160]],type:'spline'},legend:{show:true,position:'bottom'}});";
  const result = makeC3ChartsResponsive(original);
  assert.equal(result.includes("size:{width:"), false);
  assert.doesNotThrow(() => new Function(result));
  assert.match(result, /height:\(height_1794659068581 - 20\)/);
  assert.match(result, /\[860,182\],\[0,160\]/);
  let captured;
  new Function("c3", result)({
    generate(options) {
      captured = options;
    },
  });
  assert.equal(captured.size.width, undefined);
  assert.equal(captured.size.height, 480);
  assert.deepEqual(captured.data.rows, [
    ["Access", "Students"],
    [860, 182],
    [0, 160],
  ]);
});

test("dense category labels reserve space above the legend and preserve measured values", () => {
  const source =
    "var chart_123=c3.generate({size:{width:500,height:480},axis:{x:{type:'category',categories:['Material 1','Material 6','Item 1','Material 9','Item 2','Material 10','Item 3','Material 5']}},data:{rows:[['Access'],[860],[600]]},legend:{show:true,position:'bottom'}});";
  let captured;
  new Function("c3", makeC3ChartsResponsive(source))({
    generate(options) {
      captured = options;
    },
  });
  assert.equal(captured.axis.x.height, 80);
  assert.deepEqual(captured.axis.x.tick, {
    rotate: -45,
    multiline: false,
    culling: false,
  });
  assert.equal(captured.axis.x.categories.length, 8);
  assert.deepEqual(captured.data.rows, [["Access"], [860], [600]]);
  assert.equal(captured.legend.position, "bottom");
});

test("numeric C3 widths are removed, other widths and unqualified scripts remain unchanged", () => {
  const input =
    "c3.generate({size:{width:500.0,height:480},bar:{width:20},legend:{show:false}})";
  assert.equal(
    makeC3ChartsResponsive(input),
    "c3.generate({size: { height:480},bar:{width:20},legend:{show:false}})",
  );
  const other = "new ApexCharts(node,{size:{width:500,height:400}})";
  assert.equal(makeC3ChartsResponsive(other), other);
  const unknown = "c3.generate({size:{width:calculateWidth(),height:400}})";
  assert.equal(
    makeC3ChartsResponsive(unknown),
    unknown,
    "Unreviewed expressions are unchanged",
  );
  assert.equal(makeC3ChartsResponsive(null), null);
});
