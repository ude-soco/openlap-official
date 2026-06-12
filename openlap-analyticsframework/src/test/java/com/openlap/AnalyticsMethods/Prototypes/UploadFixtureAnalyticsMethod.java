package com.openlap.AnalyticsMethods.Prototypes;

import com.openlap.dataset.OpenLAPColumnDataType;
import com.openlap.dataset.OpenLAPDataColumnFactory;
import com.openlap.dataset.OpenLAPDataSet;
import com.openlap.exceptions.OpenLAPDataColumnException;
import com.openlap.template.AnalyticsMethod;
import java.io.InputStream;

public class UploadFixtureAnalyticsMethod extends AnalyticsMethod {
  public UploadFixtureAnalyticsMethod() {
    try {
      OpenLAPDataSet input = new OpenLAPDataSet();
      input.addOpenLAPDataColumn(
          OpenLAPDataColumnFactory.createOpenLAPDataColumnOfType(
              "score", OpenLAPColumnDataType.Numeric, true, "Score", "Input score"));
      setInput(input);

      OpenLAPDataSet output = new OpenLAPDataSet();
      output.addOpenLAPDataColumn(
          OpenLAPDataColumnFactory.createOpenLAPDataColumnOfType(
              "result", OpenLAPColumnDataType.Numeric, true, "Result", "Output result"));
      setOutput(output);
      setType("upload-fixture");
    } catch (OpenLAPDataColumnException exception) {
      throw new IllegalStateException(exception);
    }
  }

  @Override
  protected void implementationExecution() {
  }

  @Override
  public Boolean hasPMML() {
    return false;
  }

  @Override
  public InputStream getPMMLInputStream() {
    return null;
  }

  @Override
  public String getAnalyticsMethodName() {
    return "Upload Fixture Analytics Method";
  }

  @Override
  public String getAnalyticsMethodDescription() {
    return "Analytics method used by upload tests.";
  }

  @Override
  public String getAnalyticsMethodCreator() {
    return "OpenLAP Test";
  }
}
