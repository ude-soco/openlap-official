package com.openlap.analytics_statements.dtos.request;

import com.openlap.analytics_statements.entities.utility_entities.UniqueIdentifierType;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import lombok.*;

@Data
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class LrsProviderRequest {
  @NotBlank(message = "Title is mandatory")
  private String title;

  @NotNull(message = "Unique identifier type is mandatory")
  private UniqueIdentifierType uniqueIdentifierType;
}
