package com.openlap.visualization_methods.dto;

import com.openlap.template.model.ChartConfiguration;
import lombok.*;

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

}
