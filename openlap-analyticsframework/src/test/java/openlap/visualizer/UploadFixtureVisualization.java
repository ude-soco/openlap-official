package openlap.visualizer;

import com.openlap.dataset.OpenLAPColumnDataType;
import com.openlap.dataset.OpenLAPDataColumnFactory;
import com.openlap.dataset.OpenLAPDataSet;
import com.openlap.exceptions.OpenLAPDataColumnException;
import com.openlap.exceptions.VisualizationCodeGenerationException;
import com.openlap.template.DataTransformer;
import com.openlap.template.VisualizationCodeGenerator;
import com.openlap.template.model.ChartConfiguration;
import java.util.Map;

public class UploadFixtureVisualization extends VisualizationCodeGenerator {
  @Override
  public String getName() {
    return "Upload Fixture Visualization";
  }

  @Override
  public ChartConfiguration getConfiguration() {
    return new ChartConfiguration(
        true, false, false, false, false, false,
        false, false, false, true, false, false,
        false, false, false, false, false, false,
        false, false, false, false, false, false,
        false, false, false, false);
  }

  @Override
  public void initializeDataSetConfiguration() {
    try {
      OpenLAPDataSet input = new OpenLAPDataSet();
      input.addOpenLAPDataColumn(
          OpenLAPDataColumnFactory.createOpenLAPDataColumnOfType(
              "label", OpenLAPColumnDataType.Text, true, "Label", "Label to render"));
      setInput(input);
      setOutput(new OpenLAPDataSet());
    } catch (OpenLAPDataColumnException exception) {
      throw new IllegalStateException(exception);
    }
  }

  @Override
  public Class getDataTransformer() {
    return UploadFixtureDataTransformer.class;
  }

  @Override
  public String visualizationLibraryScript() {
    return "";
  }

  @Override
  public String visualizationCode(DataTransformer dataTransformer, Map<String, Object> additionalParams)
      throws VisualizationCodeGenerationException {
    return "<script>window.uploadFixture=true;</script>";
  }
}
