package com.openlap.analytics_module.controllers;

import com.openlap.analytics_module.services.IndicatorService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.beans.factory.annotation.Value;
import jakarta.servlet.http.HttpServletResponse;

@Controller
@RequestMapping("/v1/code")
@RequiredArgsConstructor
public class IFrameController {
  private final IndicatorService indicatorService;
  @Value("${frontend.urls:http://localhost:5173}") private String frontendUrls = "";

  @GetMapping("/render")
  public String renderer(Model model, HttpServletResponse response) {
    java.util.List<String> origins = new java.util.ArrayList<>();
    for (String url : frontendUrls.split(",")) try {
      java.net.URI uri = java.net.URI.create(url.trim());
      if (("https".equals(uri.getScheme()) || "http".equals(uri.getScheme())) && uri.getHost() != null && uri.getUserInfo() == null) {
        int port = uri.getPort();
        if (("http".equals(uri.getScheme()) && port == 80) || ("https".equals(uri.getScheme()) && port == 443)) port = -1;
        origins.add(new java.net.URI(uri.getScheme(), null, uri.getHost(), port, null, null, null).toString());
      }
    } catch (IllegalArgumentException | java.net.URISyntaxException ignored) { /* Fail closed to this backend's own origin. */ }
    model.addAttribute("parentOrigins", String.join(",", origins));
    response.setHeader("Content-Security-Policy", "default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'none'");
    return "chart-renderer";
  }

  @GetMapping(value = "/runtime.js", produces = "text/javascript")
  public ResponseEntity<Resource> runtimeScript() {
    return ResponseEntity.ok().contentType(MediaType.parseMediaType("text/javascript"))
        .cacheControl(CacheControl.noCache())
        .body(new ClassPathResource("openlap-chart-runtime/renderer.js"));
  }

  // DOC: <iframe src='http://localhost:8090/code/indicator?indicatorId=6688167505dc670185b608f2'
  // frameborder='0'height='600px' width='600px' />
  @RequestMapping("/indicators")
  public String generateIndicatorTemplate(@RequestParam String indicatorId, Model model) {
    return indicatorService.getInteractiveIndicatorTemplate(indicatorId, model);
  }

  @RequestMapping("/questions")
  public String generateQuestionTemplate(@RequestParam String questionId, Model model) {
    return indicatorService.getInteractiveQuestionCode(questionId, model);
  }
}
