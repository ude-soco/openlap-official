package com.openlap.analytics_module.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.openlap.analytics_module.dto.requests.indicator.IndicatorBasicPreviewRequest;
import com.openlap.analytics_module.repositories.IndicatorCacheRepository;
import com.openlap.analytics_module.services.IndicatorUtilityService;
import com.openlap.analytics_statements.services.StatementService;
import com.openlap.analytics_technique.services.AnalyticsTechniqueService;
import com.openlap.dataset.OpenLAPDataSet;
import com.openlap.infrastructure.exception.ValidationException;
import com.openlap.user.services.TokenService;
import org.junit.Test;
import org.springframework.http.HttpStatus;

/**
 * Unit test for {@link IndicatorBasicServiceImpl#previewIndicator}. When visualization code
 * generation fails for the chosen chart (e.g. a chart that cannot render the analyzed data, such as
 * the reported Bar Chart case), the service must surface a CONTROLLED 400 {@link ValidationException}
 * — never an opaque 500. Analysis itself is mocked to succeed; only the chart-code generation fails.
 */
public class IndicatorBasicServiceImplPreviewTest {

  private final AnalyticsTechniqueService analyticsTechniqueService =
      mock(AnalyticsTechniqueService.class);
  private final StatementService statementService = mock(StatementService.class);
  private final IndicatorUtilityService indicatorUtilityService =
      mock(IndicatorUtilityService.class);
  private final TokenService tokenService = mock(TokenService.class);
  private final IndicatorCacheRepository indicatorCacheRepository =
      mock(IndicatorCacheRepository.class);

  private final IndicatorBasicServiceImpl service =
      new IndicatorBasicServiceImpl(
          analyticsTechniqueService,
          statementService,
          indicatorUtilityService,
          tokenService,
          indicatorCacheRepository);

  @Test
  public void previewReturnsControlled400WhenChartCodeGenerationFails() {
    // Analysis step succeeds ...
    when(statementService.findStatements(any())).thenReturn(mock(OpenLAPDataSet.class));
    when(indicatorUtilityService.getAnalyzedDataSetMethod(any(), any()))
        .thenReturn(mock(OpenLAPDataSet.class));
    // ... but visualization code generation fails (chart incompatible with the data).
    when(indicatorUtilityService.getIndicatorCodeMethod(any(), any(), any(), any(), any(), any()))
        .thenThrow(new RuntimeException("chart cannot render this dataset"));

    Throwable thrown =
        catchThrowable(() -> service.previewIndicator(mock(IndicatorBasicPreviewRequest.class)));

    assertThat(thrown).isInstanceOf(ValidationException.class);
    ValidationException ve = (ValidationException) thrown;
    assertThat(ve.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
    assertThat(ve.getCode()).isEqualTo("INDICATOR_PREVIEW_INVALID");
  }
}
