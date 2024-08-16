package com.openlap.analytics_module.controllers;

import com.openlap.analytics_module.services.IndicatorService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
@RequestMapping("/v1/code")
@RequiredArgsConstructor
public class IFrameController {
  private final IndicatorService indicatorService;

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
