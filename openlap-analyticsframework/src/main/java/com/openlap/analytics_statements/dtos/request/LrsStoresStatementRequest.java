package com.openlap.analytics_statements.dtos.request;

import com.openlap.analytics_statements.entities.utility_entities.UserQueryCondition;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import lombok.*;

@Data
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class LrsStoresStatementRequest {
  @NotBlank(message = "LRS is mandatory")
  private String lrsId;

  @NotBlank(message = "Unique identifier is mandatory")
  private String uniqueIdentifier;

//  @NotNull(message = "User query statement condition is mandatory")
//  private UserQueryCondition condition;
}
