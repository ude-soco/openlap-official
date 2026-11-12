package com.openlap.analytics_statements.dtos.response;

import com.openlap.analytics_statements.entities.utility_entities.UniqueIdentifierType;
import lombok.*;

@Data
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class LrsStoreResponse {
  private String lrsId;
  private String title;
  private UniqueIdentifierType uniqueIdentifierType;
}
