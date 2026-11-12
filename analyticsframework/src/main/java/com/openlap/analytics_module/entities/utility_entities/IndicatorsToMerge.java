package com.openlap.analytics_module.entities.utility_entities;

import com.openlap.analytics_module.entities.Indicator;
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
}
