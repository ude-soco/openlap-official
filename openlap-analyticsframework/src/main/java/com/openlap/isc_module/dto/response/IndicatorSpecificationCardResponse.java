package com.openlap.isc_module.dto.response;

import lombok.*;

import java.time.LocalDateTime;

@Data
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class IndicatorSpecificationCardResponse {
  private String id;
  private String indicatorName;
  private String createdBy;
  private LocalDateTime createdOn;
}
