package com.openlap.analytics_module.dto.requests.indicator;


import lombok.*;
import jakarta.validation.constraints.NotBlank;

@Data
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class IndicatorToAnalyze {
	@NotBlank(message = "Indicator ID is mandatory")
	private String indicatorId;
}
