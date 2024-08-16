package com.openlap.analytics_statements.dtos.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.NotBlank;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LrsUpdateRequest {
  @NotBlank(message = "Title is mandatory")
  private String title;
}
