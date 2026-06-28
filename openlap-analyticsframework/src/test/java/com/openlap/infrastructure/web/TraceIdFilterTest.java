package com.openlap.infrastructure.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.openlap.infrastructure.error.ApiErrorResponseFactory;
import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import java.io.IOException;
import org.junit.After;
import org.junit.Test;
import org.slf4j.MDC;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

/** Unit tests for the correlation-id filter. */
public class TraceIdFilterTest {

  private final TraceIdFilter filter = new TraceIdFilter();

  @After
  public void clearMdc() {
    MDC.clear();
  }

  /** Captures the MDC value visible while the chain executes (i.e. during request handling). */
  private static class CapturingChain implements FilterChain {
    String traceIdDuringChain;

    @Override
    public void doFilter(ServletRequest request, ServletResponse response) {
      traceIdDuringChain = MDC.get(ApiErrorResponseFactory.TRACE_ID_MDC_KEY);
    }
  }

  @Test
  public void reusesInboundRequestId() throws ServletException, IOException {
    MockHttpServletRequest request = new MockHttpServletRequest();
    request.addHeader(TraceIdFilter.REQUEST_ID_HEADER, "inbound-123");
    MockHttpServletResponse response = new MockHttpServletResponse();
    CapturingChain chain = new CapturingChain();

    filter.doFilter(request, response, chain);

    assertThat(chain.traceIdDuringChain).isEqualTo("inbound-123");
    assertThat(response.getHeader(TraceIdFilter.REQUEST_ID_HEADER)).isEqualTo("inbound-123");
  }

  @Test
  public void fallsBackToCorrelationIdHeader() throws ServletException, IOException {
    MockHttpServletRequest request = new MockHttpServletRequest();
    request.addHeader(TraceIdFilter.CORRELATION_ID_HEADER, "corr-456");
    MockHttpServletResponse response = new MockHttpServletResponse();
    CapturingChain chain = new CapturingChain();

    filter.doFilter(request, response, chain);

    assertThat(chain.traceIdDuringChain).isEqualTo("corr-456");
    assertThat(response.getHeader(TraceIdFilter.REQUEST_ID_HEADER)).isEqualTo("corr-456");
  }

  @Test
  public void generatesIdWhenMissing() throws ServletException, IOException {
    MockHttpServletRequest request = new MockHttpServletRequest();
    MockHttpServletResponse response = new MockHttpServletResponse();
    CapturingChain chain = new CapturingChain();

    filter.doFilter(request, response, chain);

    assertThat(chain.traceIdDuringChain).isNotBlank();
    assertThat(response.getHeader(TraceIdFilter.REQUEST_ID_HEADER)).isEqualTo(chain.traceIdDuringChain);
  }

  @Test
  public void clearsMdcAfterRequest() throws ServletException, IOException {
    MockHttpServletRequest request = new MockHttpServletRequest();
    request.addHeader(TraceIdFilter.REQUEST_ID_HEADER, "x");
    MockHttpServletResponse response = new MockHttpServletResponse();

    filter.doFilter(request, response, new CapturingChain());

    assertThat(MDC.get(ApiErrorResponseFactory.TRACE_ID_MDC_KEY)).isNull();
  }
}
