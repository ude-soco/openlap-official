package com.openlap.analytics_module.dto.requests.indicator;

import lombok.*;

import javax.validation.Valid;
import javax.validation.constraints.NotEmpty;
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
	private List<IndicatorToAnalyze> indicators = new ArrayList<>();
}
