package com.openlap.visualization_methods.dto;

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
}
