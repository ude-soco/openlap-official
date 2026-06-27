package com.openlap.isc_module.entities;

import com.openlap.user.entities.User;
import java.time.LocalDateTime;
import lombok.*;
import org.springframework.data.mongodb.core.mapping.DBRef;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Document("openlap-isc")
public class IndicatorSpecificationCard {
  private String id;
  private String requirements;
  private String dataset;
  private String visRef;
  private String lockedStep;
  @DBRef private User createdBy;
  private LocalDateTime createdOn;

  // ---- Phase 0 (Draft/Saved lifecycle) additions — all optional/additive ----

  /**
   * Lifecycle status. May be null on documents created before this field existed; such rows are
   * treated as {@link IscStatus#SAVED} at read time.
   */
  private IscStatus status;

  /**
   * When this row is an EDIT draft, the id of the saved ISC it edits. Null for saved ISCs and for
   * new drafts.
   */
  private String sourceId;

  /** Last time the card was modified (create / update / autosave / publish). */
  private LocalDateTime updatedOn;

  /**
   * Denormalized indicator name (also held inside the {@code requirements} JSON). Stored so the
   * list endpoint can sort/search by name server-side without parsing every document.
   */
  private String indicatorName;
}
