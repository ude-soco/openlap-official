package com.openlap.visualization_methods.dto;

import com.openlap.dataset.OpenLAPColumnConfigData;
import com.openlap.template.model.ChartConfiguration;
import lombok.*;

import java.util.List;

@Data
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class VisualizationTypeResponse {
  private String id;
  private String library;
  private String name;
  private String imageCode;
  private ChartConfiguration chartConfiguration;
  // * TODO: Visualization input
  private List<OpenLAPColumnConfigData> chartInputs;
}
