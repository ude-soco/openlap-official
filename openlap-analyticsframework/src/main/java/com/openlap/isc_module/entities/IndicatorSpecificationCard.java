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
@Document("openlap-isc")
public class IndicatorSpecificationCard {
  private String id;
  private String requirements;
  private String dataset;
  private String visRef;
  private String lockedStep;
  @DBRef private User createdBy;
  private LocalDateTime createdOn;
}
