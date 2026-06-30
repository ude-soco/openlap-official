package com.openlap.user.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.openlap.user.dto.response.utils.AdminLrsProviderConnection;
import com.openlap.user.dto.response.utils.LrsConsumerResponse;
import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Admin-facing user detail. Exposes safe fields only (id, name, email, role names, and the user's
 * LRS connections via secret-free DTOs). Never includes the password hash or any LRS
 * client credential/secret.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AdminUserDetailResponse {
  private String id;
  private String name;
  private String email;
  private List<String> roles = new ArrayList<>();
  private List<LrsConsumerResponse> lrsConsumerConnections = new ArrayList<>();
  private List<AdminLrsProviderConnection> lrsProviderConnections = new ArrayList<>();
}
