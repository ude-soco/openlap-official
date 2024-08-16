package com.openlap.visualization_methods.entities;

import java.util.List;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.DBRef;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Document("visualization-library")
public class VisLibrary {
  @Id private String id;
  private String creator;
  private String name;
  private String description;
  private String frameworkLocation;
  @DBRef private List<VisType> visualizationTypes;
}
