package com.openlap.analytics_module.entities.utility_entities;

import lombok.*;

@Data
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class IndicatorQuery {
  private Object[] query;
  private Object[] agg;
  private Object parametersToBeReturnedInResult;
  private Object[] filter;
}
