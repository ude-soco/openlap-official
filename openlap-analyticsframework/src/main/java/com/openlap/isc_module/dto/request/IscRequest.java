package com.openlap.isc_module.dto.request;

import javax.validation.constraints.NotBlank;
import lombok.*;

@Data
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class IscRequest {
  @NotBlank(message = "Requirements is mandatory")
  private String requirements;

  @NotBlank(message = "Dataset is mandatory")
  private String dataset;

  @NotBlank(message = "VisRef is mandatory")
  private String visRef;

  @NotBlank(message = "Locked step is mandatory")
  private String lockedStep;
}
