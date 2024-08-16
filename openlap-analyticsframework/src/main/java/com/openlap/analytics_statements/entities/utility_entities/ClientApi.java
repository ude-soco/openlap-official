package com.openlap.analytics_statements.entities.utility_entities;

import lombok.*;

@Data
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ClientApi {
  private String basic_key;
  private String basic_secret;
  private String basic_auth;
}
