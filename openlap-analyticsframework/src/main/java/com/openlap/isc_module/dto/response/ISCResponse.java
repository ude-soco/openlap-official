package com.openlap.isc_module.dto.response;

import com.openlap.isc_module.entities.IscStatus;
import java.time.LocalDateTime;
import lombok.*;

@Data
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ISCResponse {
  private String id;
  private String requirements;
  private String dataset;
  private String visRef;
  private String lockedStep;
  private String createdBy;
  private LocalDateTime createdOn;

  // ---- Phase 0 additions (additive; existing clients ignore unknown fields) ----
  private IscStatus status;
  private String sourceId;
  private LocalDateTime updatedOn;
}
