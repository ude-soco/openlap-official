package com.openlap.analytics_module.dto.response.indicator;


import com.openlap.dataset.OpenLAPColumnConfigData;
import lombok.*;

import java.util.List;

@Data
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class IndicatorsAnalyzedResponse {
	private List<IndicatorsAnalyzed> indicators;
	private List<OpenLAPColumnConfigData> analyticsOutputs;
}

