package openlap.visualizer;

import com.openlap.template.VisualizationLibraryInfo;

public class UploadFixtureVisualizationLibrary extends VisualizationLibraryInfo {
  @Override
  public String getName() {
    return "Upload Fixture Visualization Library";
  }

  @Override
  public String getDescription() {
    return "Visualization library used by upload tests.";
  }

  @Override
  public String getDeveloperName() {
    return "OpenLAP Test";
  }
}
