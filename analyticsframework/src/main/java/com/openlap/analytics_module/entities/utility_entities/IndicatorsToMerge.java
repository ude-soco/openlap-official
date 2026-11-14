package com.openlap.analytics_module.entities.utility_entities;

import com.openlap.analytics_module.entities.Indicator;
import java.util.List;
import lombok.*;
import org.springframework.data.mongodb.core.mapping.DBRef;

@Data
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class IndicatorsToMerge {
  @DBRef private Indicator indicator;
  private String columnToMerge;
  private List<String> measureColumnIds;
  private String label;

  public IndicatorsToMerge(Indicator indicator, String columnToMerge) {
    this(indicator, columnToMerge, null, null);
  }
}
