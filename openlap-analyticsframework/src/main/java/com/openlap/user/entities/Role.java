package com.openlap.user.entities;

import lombok.*;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Document("openlap-roles")
public class Role {
  @Id private String id;
  private RoleType name;
}
