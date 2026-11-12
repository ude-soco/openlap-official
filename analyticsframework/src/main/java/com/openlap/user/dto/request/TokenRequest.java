package com.openlap.user.dto.request;

import com.auth0.jwt.algorithms.Algorithm;
import lombok.*;

@Data
@Setter
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class TokenRequest {
  private String userEmail;
  private String[] roles;
  private String token;
  private Algorithm algorithm;
}
