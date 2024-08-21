package com.openlap.isc_module.dto.response;

import lombok.*;

import java.time.LocalDateTime;

@Data
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class ISCResponse {
  private String id;
  private String requirements;
  private String dataset;
  private String visRef;
  private String lockedStep;
  private String createdBy;
  private LocalDateTime createdOn;
}
