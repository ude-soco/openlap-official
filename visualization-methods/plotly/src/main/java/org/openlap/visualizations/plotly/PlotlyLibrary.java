package org.openlap.visualizations.plotly;

import com.openlap.template.VisualizationLibraryInfo;

public final class PlotlyLibrary extends VisualizationLibraryInfo {
  @Override
  public String getName() {
    return "Plotly.js (bundled)";
  }

  @Override
  public String getDescription() {
    return "Nine interactive chart types with Plotly.js included.";
  }

  @Override
  public String getDeveloperName() {
    return "OpenLAP contributors";
  }
}
