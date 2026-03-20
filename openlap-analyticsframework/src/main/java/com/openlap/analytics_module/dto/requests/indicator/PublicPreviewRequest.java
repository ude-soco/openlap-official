package com.openlap.analytics_module.dto.requests.indicator;

import javax.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PublicPreviewRequest {

  @NotBlank(message = "LRS ID is mandatory")
  private String lrsId;

  @NotBlank(message = "User ID is mandatory")
  private String userId;
}
