package com.openlap.AnalyticsMethods.Prototypes;

import com.openlap.dataset.*;
import com.openlap.dynamicparam.OpenLAPDynamicParams;
import com.openlap.template.AnalyticsMethod;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Objects;

/** Mirrors the nonnull row assumptions of the historical ColumnBased and CountItems methods. */
public class NullSensitiveMethodFixture extends AnalyticsMethod {
  public NullSensitiveMethodFixture(OpenLAPColumnDataType measurementType) {
    setInput(new OpenLAPDataSet());
    setOutput(new OpenLAPDataSet());
    setParams(new OpenLAPDynamicParams());
    for (OpenLAPDataSet data : new OpenLAPDataSet[] {getInput(), getOutput()}) {
      data.getColumns().put("value", new OpenLAPDataColumn<>("value", measurementType, true, "Value", ""));
      data.getColumns().put("group", new OpenLAPDataColumn<>("group", OpenLAPColumnDataType.Text, true, "Group", ""));
    }
  }

  @Override @SuppressWarnings({"rawtypes", "unchecked"})
  protected void implementationExecution() {
    var values = getInput().getColumns().get("value").getData();
    var groups = getInput().getColumns().get("group").getData();
    for (int row = 0; row < values.size(); row++) {
      Objects.requireNonNull(values.get(row));
      Objects.requireNonNull(groups.get(row));
    }
    getOutput().getColumns().get("value").setData(new ArrayList(values));
    getOutput().getColumns().get("group").setData(new ArrayList(groups));
  }
  @Override public Boolean hasPMML() { return false; }
  @Override public InputStream getPMMLInputStream() { return null; }
  @Override public String getAnalyticsMethodName() { return "Legacy null-sensitive fixture"; }
  @Override public String getAnalyticsMethodDescription() { return "Test fixture"; }
  @Override public String getAnalyticsMethodCreator() { return "Tests"; }
}
