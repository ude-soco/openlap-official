package com.openlap.analytics_module.services;

import com.openlap.analytics_module.dto.requests.analytics_question.AnalyticsQuestionRequest;
import com.openlap.analytics_module.dto.response.analytics_question.AnalyticsQuestionResponse;
import com.openlap.analytics_module.entities.AnalyticsQuestion;
import javax.servlet.http.HttpServletRequest;
import javax.validation.Valid;
import org.springframework.data.domain.Page;

public interface QuestionService {
  void createQuestion(HttpServletRequest request, @Valid AnalyticsQuestionRequest question);

  AnalyticsQuestionResponse getQuestion(String questionId);

  AnalyticsQuestion fetchQuestionMethod(String questionId);

  Page<AnalyticsQuestionResponse> getAllMyQuestions(
      HttpServletRequest request, int page, int size, String sortBy, String sortDirection);

  void updateQuestion(
      HttpServletRequest request, String questionId, AnalyticsQuestionRequest analyticsQuestion);

  void deleteQuestion(HttpServletRequest request, String questionId);

  void validateQuestionForAvailability(String questionName);

  String requestInteractiveQuestionCode(String questionId, HttpServletRequest request);

  Page<AnalyticsQuestionResponse> getAllAvailableQuestions(
      int page, int size, String sortBy, String sortDirection);
}
