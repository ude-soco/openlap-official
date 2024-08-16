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
public class ActivityTypesRequest {
  @NotEmpty(message = "List of LRS ids is mandatory")
  @Valid
  private List<@NotNull(message = "LRS stores cannot be blank") LrsStoresStatementRequest>
      lrsStores;

  @NotEmpty(message = "List of platforms is mandatory")
  @Valid
  private List<@NotNull(message = "Platform cannot be blank") String> platforms;
}
