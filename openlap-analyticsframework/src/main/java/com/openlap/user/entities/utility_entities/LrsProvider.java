package com.openlap.user.entities.utility_entities;

import com.openlap.analytics_statements.entities.utility_entities.UniqueIdentifierType;
import lombok.*;

@Data
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class LrsProvider {
  // TODO: Add a id to the class
  private String lrsId;
  private String clientId;
  private UniqueIdentifierType uniqueIdentifierType;
}
