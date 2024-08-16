package com.openlap.analytics_statements.dtos.request;

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
public class ActionOnActivitiesRequest {
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

  @NotEmpty(message = "Activities map is mandatory")
  @Valid
  private Map<
          @NotBlank(message = "Activity key cannot be blank") String,
          @NotNull(message = "Activity values cannot be empty") ArrayList<String>>
      activities;
}
