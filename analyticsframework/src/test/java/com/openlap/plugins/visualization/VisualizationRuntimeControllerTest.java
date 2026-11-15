package com.openlap.plugins.visualization;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

class VisualizationRuntimeControllerTest {
  @Test void manifestsAreNotCachedAndReceiveTheBackendContextPath() {
    VisualizationRuntimeService service=mock(VisualizationRuntimeService.class);
    when(service.runtime("type","/api")).thenReturn(Map.of("artifactId","visualizations-example"));
    MockHttpServletRequest request=new MockHttpServletRequest();request.setContextPath("/api");
    var result=new VisualizationRuntimeController(service).runtime("type",request);
    assertThat(result.getHeaders().getCacheControl()).isEqualTo("no-store");
    assertThat(result.getBody().getData()).isEqualTo(Map.of("artifactId","visualizations-example"));
  }
  @Test void resourcesHavePinnedCachingAndSafeMediaHeaders() {
    VisualizationRuntimeService service=mock(VisualizationRuntimeService.class);
    when(service.asset("type","artifact","script")).thenReturn(new VisualizationRuntimeService.Asset(new byte[]{1,2},"text/javascript","a".repeat(64)));
    var result=new VisualizationRuntimeController(service).asset("type","artifact","script");
    assertThat(result.getBody()).containsExactly(1,2);
    assertThat(result.getHeaders().getCacheControl()).contains("public","immutable","max-age=31536000");
    assertThat(result.getHeaders().getFirst("X-Content-Type-Options")).isEqualTo("nosniff");
    assertThat(result.getHeaders().getFirst("Content-Security-Policy")).isEqualTo("default-src 'none'; sandbox");
    assertThat(result.getHeaders().getETag()).isEqualTo("\""+"a".repeat(64)+"\"");
  }
}
