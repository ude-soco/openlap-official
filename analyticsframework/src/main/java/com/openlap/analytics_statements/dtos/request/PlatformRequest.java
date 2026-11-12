package com.openlap.analytics_statements.dtos.request;

import java.util.List;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
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
