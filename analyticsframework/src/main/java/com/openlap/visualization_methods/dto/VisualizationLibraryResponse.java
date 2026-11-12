package com.openlap.visualization_methods.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Getter;

@Data
@Getter
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class VisualizationLibraryResponse {
  private String id;
  private String creator;
  private String name;
  private String description;
}
