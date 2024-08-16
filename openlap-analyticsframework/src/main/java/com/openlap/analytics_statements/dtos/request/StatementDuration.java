package com.openlap.analytics_statements.dtos.request;

import lombok.*;

import javax.validation.constraints.NotBlank;

@Data
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class StatementDuration {
  @NotBlank(message = "From date cannot be blank")
  private String from;

  @NotBlank(message = "Until date cannot be blank")
  private String until;
}
