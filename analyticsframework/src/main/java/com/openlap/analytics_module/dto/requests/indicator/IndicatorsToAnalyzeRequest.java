package com.openlap.analytics_module.dto.requests.indicator;

import lombok.*;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.ArrayList;
import java.util.List;

@Data
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class IndicatorsToAnalyzeRequest {
	@Valid
	@NotEmpty(message = "List of indicators is mandatory")
	@Size(max = 10, message = "Choose at most ten indicators")
	private List<@NotNull @Valid IndicatorToAnalyze> indicators = new ArrayList<>();
}
