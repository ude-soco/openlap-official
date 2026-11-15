package com.openlap.analytics_module.embedding;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.openlap.analytics_module.controllers.IFrameController;
import com.openlap.analytics_module.services.IndicatorService;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.*;
import org.thymeleaf.spring6.SpringTemplateEngine;
import org.thymeleaf.context.WebContext;
import org.thymeleaf.templateresolver.ClassLoaderTemplateResolver;
import org.thymeleaf.templatemode.TemplateMode;
import org.thymeleaf.web.servlet.JakartaServletWebApplication;

class IFrameTemplateTest {
  String render(String template,Map<String,Object> variables) {
    ClassLoaderTemplateResolver resolver=new ClassLoaderTemplateResolver();resolver.setPrefix("templates/");resolver.setSuffix(".html");resolver.setTemplateMode(TemplateMode.HTML);
    SpringTemplateEngine engine=new SpringTemplateEngine();engine.setTemplateResolver(resolver);
    MockServletContext servlet=new MockServletContext();servlet.setContextPath("/api");
    MockHttpServletRequest request=new MockHttpServletRequest(servlet);request.setContextPath("/api");request.setRequestURI("/api/v1/code/indicators");
    var exchange=JakartaServletWebApplication.buildApplication(servlet).buildExchange(request,new MockHttpServletResponse());
    return engine.process(template,new WebContext(exchange,Locale.ENGLISH,variables));
  }
  @Test void indicatorTemplateKeepsPluginScriptInertUntilTheRuntimeLoadsItsDependencies() {
    String fragment="<div id='fixture'>50%</div><script>window.FixtureChart=true;</script>";
    String html=render("indicator",Map.of("indicatorName","<Title>","indicatorCode",fragment,"visualizationTypeId","type-c3"));
    assertThat(html).contains("src=\"/api/v1/code/runtime.js\"","data-type-id=\"type-c3\"","<h1>&lt;Title&gt;</h1>")
        .contains("<template data-chart-code><div id='fixture'>50%</div><script>window.FixtureChart=true;</script></template>")
        .doesNotContain("cdnjs.cloudflare.com","cdn.jsdelivr.net","d3js.org","bootstrap");
    assertThat(html.indexOf("window.FixtureChart")).isBetween(html.indexOf("<template data-chart-code>"),html.indexOf("</template>"));
  }
  @Test void aQuestionRendersEachChartAsAnIndependentTypedSlot() {
    String html=render("question",Map.of("questionName","Question <name>","questionCharts",List.of(
        Map.of("name","First","typeId","type-c3","code","<div>First</div><script>window.First=true;</script>"),
        Map.of("name","Second","typeId","type-apex","code","<div>Second</div><script>window.Second=true;</script>"))));
    assertThat(html).contains("data-type-id=\"type-c3\"","data-type-id=\"type-apex\"","Question &lt;name&gt;")
        .doesNotContain("cdnjs.cloudflare.com","cdn.jsdelivr.net","d3js.org","bootstrap");
    assertThat(html.split("<template data-chart-code",-1)).hasSize(3);
    assertThat(html.split("data-chart-slot",-1)).hasSize(3);
    assertThat(html.split("/api/v1/code/runtime.js",-1)).hasSize(2);
  }
  @Test void publicRendererPageAndBootstrapAreProvidedByOpenlap() throws Exception {
    String html=render("chart-renderer",Map.of());
    assertThat(html).contains("data-openlap-renderer=\"true\"","id=\"openlap-chart\"","src=\"/api/v1/code/runtime.js\"")
        .doesNotContain("cdnjs.cloudflare.com","cdn.jsdelivr.net","d3js.org");
    IFrameController controller=new IFrameController(mock(IndicatorService.class));
    org.springframework.test.util.ReflectionTestUtils.setField(controller,"frontendUrls","https://frontend.example/path,http://localhost:5174,https://user:password@private.example,not-a-url");
    var model=new org.springframework.ui.ExtendedModelMap();var servletResponse=new MockHttpServletResponse();
    assertThat(controller.renderer(model,servletResponse)).isEqualTo("chart-renderer");
    assertThat(model).containsEntry("parentOrigins","https://frontend.example,http://localhost:5174");
    assertThat(servletResponse.getHeader("Content-Security-Policy")).contains("connect-src 'self'","base-uri 'none'","form-action 'none'");
    var response=controller.runtimeScript();
    assertThat(response.getHeaders().getContentType().toString()).isEqualTo("text/javascript");
    assertThat(response.getHeaders().getCacheControl()).isEqualTo("no-cache");
    assertThat(response.getBody().getContentAsString(java.nio.charset.StandardCharsets.UTF_8)).contains("openlapRenderer");
  }
}
