package com.openlap.analytics_module.dto.response.indicator;

import com.openlap.dataset.OpenLAPDataSet;
import lombok.*;

@Data
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class IndicatorsAnalyzed {
	private String id;
	private String name;
	private OpenLAPDataSet analyzedDataset;
}
