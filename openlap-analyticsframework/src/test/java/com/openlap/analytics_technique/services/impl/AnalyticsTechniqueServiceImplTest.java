package com.openlap.analytics_technique.services.impl;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;
import static org.mockito.Mockito.mock;

import com.openlap.analytics_technique.dto.response.AnalyticsTechniqueInputParamResponse;
import com.openlap.analytics_technique.repositories.AnalyticsTechniqueRepository;
import com.openlap.dataset.OpenLAPColumnDataType;
import com.openlap.dataset.OpenLAPDataColumnFactory;
import com.openlap.dataset.OpenLAPDataSet;
import com.openlap.dynamicparam.OpenLAPDynamicParam;
import com.openlap.dynamicparam.OpenLAPDynamicParamDataType;
import com.openlap.dynamicparam.OpenLAPDynamicParamFactory;
import com.openlap.dynamicparam.OpenLAPDynamicParamType;
import com.openlap.dynamicparam.OpenLAPDynamicParams;
import com.openlap.template.AnalyticsMethod;
import java.io.InputStream;
import java.util.List;
import org.junit.Test;

public class AnalyticsTechniqueServiceImplTest {

  @Test
  public void getAnalyticsTechniqueParamsReturnsExistingParams() throws Exception {
    TestAnalyticsMethod method = new TestAnalyticsMethod();
    OpenLAPDynamicParams params = new OpenLAPDynamicParams();
    params.addOpenLAPDynamicParam(
        OpenLAPDynamicParamFactory.createOpenLAPDataColumnOfType(
            "threshold",
            OpenLAPDynamicParamType.Textbox,
            OpenLAPDynamicParamDataType.INTEGER,
            "Threshold",
            "Minimum threshold",
            10,
            "",
            true));
    method.setParams(params);
    AnalyticsTechniqueServiceImpl service = serviceFor(method);

    List<OpenLAPDynamicParam> result = service.getAnalyticsTechniqueParams("method-id");

    assertEquals(1, result.size());
    assertEquals("threshold", result.get(0).getId());
  }

  @Test
  public void getAnalyticsTechniqueParamsReturnsEmptyListWhenMethodParamsAreNull()
      throws Exception {
    TestAnalyticsMethod method = new TestAnalyticsMethod();
    AnalyticsTechniqueServiceImpl service = serviceFor(method);

    List<OpenLAPDynamicParam> result = service.getAnalyticsTechniqueParams("method-id");

    assertNotNull(result);
    assertTrue(result.isEmpty());
  }

  @Test
  public void getAnalyticsTechniqueInputsAndParamsReturnsEmptyParamsWhenMethodParamsAreNull()
      throws Exception {
    TestAnalyticsMethod method = new TestAnalyticsMethod();
    AnalyticsTechniqueServiceImpl service = serviceFor(method);

    AnalyticsTechniqueInputParamResponse result =
        service.getAnalyticsTechniqueInputsAndParams("method-id");

    assertEquals(1, result.getInputs().size());
    assertEquals("score", result.getInputs().get(0).getId());
    assertNotNull(result.getParams());
    assertTrue(result.getParams().isEmpty());
  }

  private AnalyticsTechniqueServiceImpl serviceFor(AnalyticsMethod method) {
    return new AnalyticsTechniqueServiceImpl(mock(AnalyticsTechniqueRepository.class)) {
      @Override
      public AnalyticsMethod loadAnalyticsMethodInstance(String techniqueId) {
        return method;
      }
    };
  }

  private static final class TestAnalyticsMethod extends AnalyticsMethod {
    private TestAnalyticsMethod() throws Exception {
      OpenLAPDataSet input = new OpenLAPDataSet();
      input.addOpenLAPDataColumn(
          OpenLAPDataColumnFactory.createOpenLAPDataColumnOfType(
              "score", OpenLAPColumnDataType.Numeric, true, "Score", "Input score"));
      setInput(input);
      setOutput(new OpenLAPDataSet());
      setType("test");
    }

    @Override
    protected void implementationExecution() {
    }

    @Override
    public Boolean hasPMML() {
      return false;
    }

    @Override
    public InputStream getPMMLInputStream() {
      return null;
    }

    @Override
    public String getAnalyticsMethodName() {
      return "Test Method";
    }

    @Override
    public String getAnalyticsMethodDescription() {
      return "Test analytics method";
    }

    @Override
    public String getAnalyticsMethodCreator() {
      return "OpenLAP";
    }
  }
}
