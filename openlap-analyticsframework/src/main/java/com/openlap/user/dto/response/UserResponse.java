package com.openlap.user.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.openlap.user.dto.response.utils.LrsConsumerResponse;
import com.openlap.user.dto.response.utils.LrsProviderResponse;
import java.util.ArrayList;
import java.util.List;
import lombok.*;

@Data
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserResponse {
  private String name;
  private String email;
  private List<LrsProviderResponse> lrsProviderList = new ArrayList<>();
  private List<LrsConsumerResponse> lrsConsumerList = new ArrayList<>();
}
