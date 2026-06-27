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
public class IndicatorSpecificationCardResponse {
  private String id;
  private String indicatorName;
  private String createdBy;
  private LocalDateTime createdOn;

  // ---- Phase 0 additions: enough to render list/card views without per-row fetches ----
  private IscStatus status;
  /** NEW_DRAFT | EDIT_DRAFT | null — derived from status + sourceId. */
  private String draftKind;
  private String sourceId;
  private LocalDateTime updatedOn;
  /** Parsed from visRef.chart.type when derivable; null otherwise. */
  private String visualizationType;
  /** Parsed from dataset when derivable; null otherwise. */
  private Integer datasetRows;
  private Integer datasetColumns;
}
