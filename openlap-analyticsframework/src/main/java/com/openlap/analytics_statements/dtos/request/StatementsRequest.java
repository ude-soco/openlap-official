package com.openlap.analytics_statements.dtos.request;

import com.openlap.analytics_statements.entities.utility_entities.UserQueryCondition;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import javax.validation.Valid;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotEmpty;
import javax.validation.constraints.NotNull;
import lombok.*;

@Data
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class StatementsRequest {
  @NotEmpty(message = "List of LRS ids is mandatory")
  @Valid
  private List<@NotNull(message = "LRS stores cannot be blank") LrsStoresStatementRequest>
      lrsStores;

  @NotEmpty(message = "List of platforms is mandatory")
  @Valid
  private List<@NotNull(message = "Platform cannot be blank") String> platforms;

  @NotEmpty(message = "List of activity types is mandatory")
  @Valid
  private List<@NotNull(message = "Activity types cannot be blank") String> activityTypes;

  @NotEmpty(message = "List of action on activities is mandatory")
  @Valid
  private List<@NotNull(message = "Action on activities cannot be blank") String>
      actionOnActivities;

  @NotEmpty(message = "Activities map is mandatory")
  @Valid
  private Map<
          @NotBlank(message = "Activity key cannot be blank") String,
          @NotNull(message = "Activity values cannot be empty") ArrayList<String>>
      activities;

  @Valid private StatementDuration duration;

  @NotEmpty(message = "List of outputs is mandatory")
  @Valid
  private List<@NotBlank(message = "Outputs cannot be blank") String> outputs;

  @NotNull(message = "User query condition is mandatory")
  @Valid
  private UserQueryCondition userQueryCondition;
}
