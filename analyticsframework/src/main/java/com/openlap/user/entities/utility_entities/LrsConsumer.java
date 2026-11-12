package com.openlap.user.entities.utility_entities;

import lombok.*;
import org.bson.types.ObjectId;

@Data
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class LrsConsumer {
  private ObjectId id = new ObjectId();
  private String lrsId;
  private String uniqueIdentifier;
}
