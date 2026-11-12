package com.openlap.analytics_statements.dtos.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class LrsConsumerRequest {
  @NotBlank(message = "LRS is mandatory")
  private String lrsId;

  @NotBlank(message = "Unique identifier is mandatory")
  private String uniqueIdentifier;
}
