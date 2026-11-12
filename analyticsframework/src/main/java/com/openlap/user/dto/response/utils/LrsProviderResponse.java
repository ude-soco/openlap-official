package com.openlap.user.dto.response.utils;

import com.openlap.analytics_statements.entities.utility_entities.UniqueIdentifierType;
import java.time.LocalDate;
import lombok.*;

@Data
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class LrsProviderResponse {
  private String lrsId;
  private String lrsTitle;
  private Integer statementCount;
  private LocalDate updatedAt;
  private LocalDate createdAt;
  private String basicAuth;
  private UniqueIdentifierType uniqueIdentifierType;
}
