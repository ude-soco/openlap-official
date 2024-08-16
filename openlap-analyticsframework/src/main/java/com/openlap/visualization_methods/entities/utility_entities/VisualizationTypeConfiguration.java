package com.openlap.visualization_methods.entities.utility_entities;

import com.openlap.dataset.OpenLAPDataSet;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class VisualizationTypeConfiguration {
  private OpenLAPDataSet input;
  private OpenLAPDataSet output;
}
