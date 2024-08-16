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
public class PlatformRequest {
  @NotEmpty(message = "List of LRS ids is mandatory")
  @Valid
  private List<@NotNull(message = "LRS stores cannot be blank") LrsStoresStatementRequest>
      lrsStores;
}
