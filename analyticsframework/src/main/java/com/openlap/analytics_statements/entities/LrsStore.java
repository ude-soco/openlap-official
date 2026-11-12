package com.openlap.analytics_statements.entities;

import java.time.LocalDate;

import com.openlap.analytics_statements.entities.utility_entities.UniqueIdentifierType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.bson.types.ObjectId;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Document("lrs")
public class LrsStore {
  @Id private String id;
  private Integer statementCount;
  private ObjectId organisation;
  private LocalDate updatedAt;
  private LocalDate createdAt;
  private String title;
  private UniqueIdentifierType uniqueIdentifierType;
}
