package com.openlap.analytics_statements.dtos.request;

import java.util.List;
import javax.validation.Valid;
import javax.validation.constraints.NotEmpty;
import javax.validation.constraints.NotNull;
import lombok.*;

@Data
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ActivitiesRequest {
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
  //
  //  @NotEmpty(message = "List of action on activities is mandatory")
  //  @Valid
  //  private List<@NotNull(message = "Action on activities cannot be blank") String>
  //      actionOnActivities;
}
