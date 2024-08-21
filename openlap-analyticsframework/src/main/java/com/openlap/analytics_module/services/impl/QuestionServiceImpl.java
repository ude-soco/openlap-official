package com.openlap.analytics_module.services.impl;

import com.openlap.analytics_module.dto.requests.analytics_question.AnalyticsQuestionRequest;
import com.openlap.analytics_module.dto.response.analytics_question.AnalyticsQuestionResponse;
import com.openlap.analytics_module.dto.response.indicator.IndicatorWithCodeResponse;
import com.openlap.analytics_module.entities.AnalyticsQuestion;
import com.openlap.analytics_module.entities.Indicator;
import com.openlap.analytics_module.exceptions.analytics_question.AnalyticsQuestionAlreadyExistsException;
import com.openlap.analytics_module.exceptions.analytics_question.AnalyticsQuestionMethodNotAllowedException;
import com.openlap.analytics_module.exceptions.analytics_question.AnalyticsQuestionNotFoundException;
import com.openlap.analytics_module.repositories.QuestionRepository;
import com.openlap.analytics_module.services.AnalyticsGoalsService;
import com.openlap.analytics_module.services.IndicatorService;
import com.openlap.analytics_module.services.IndicatorUtilityService;
import com.openlap.analytics_module.services.QuestionService;
import com.openlap.exception.DatabaseOperationException;
import com.openlap.exception.ServiceException;
import com.openlap.user.entities.User;
import com.openlap.user.services.TokenService;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import javax.servlet.http.HttpServletRequest;
import javax.transaction.Transactional;
import javax.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.bson.types.ObjectId;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;

@Service
// @RequiredArgsConstructor
@Transactional
@Slf4j
public class QuestionServiceImpl implements QuestionService {
  private final QuestionRepository questionRepository;
  private final AnalyticsGoalsService analyticsGoalsService;
  private final IndicatorUtilityService indicatorUtilityService;
  private final TokenService tokenService;
  private final IndicatorService indicatorService;

  public QuestionServiceImpl(
      QuestionRepository questionRepository,
      AnalyticsGoalsService analyticsGoalsService,
      IndicatorUtilityService indicatorUtilityService,
      @Lazy IndicatorService indicatorService,
      TokenService tokenService) {
    this.questionRepository = questionRepository;
    this.analyticsGoalsService = analyticsGoalsService;
    this.indicatorUtilityService = indicatorUtilityService;
    this.tokenService = tokenService;
    this.indicatorService = indicatorService;
  }

  @Override
  public void createQuestion(
      HttpServletRequest request, @Valid AnalyticsQuestionRequest analyticsQuestionRequest) {
    log.info("Creating analytics question: {}", analyticsQuestionRequest.getQuestion());
    try {
      String questionName = analyticsQuestionRequest.getQuestion();
      validateQuestionForAvailability(questionName);
      User createdBy = tokenService.getUserFromToken(request);
      List<Indicator> indicatorList =
          generateIndicatorList(analyticsQuestionRequest.getIndicators());
      AnalyticsQuestion analyticsQuestion = new AnalyticsQuestion();
      analyticsQuestion.setName(questionName);
      analyticsQuestion.setCreatedBy(createdBy);
      analyticsQuestion.setCreatedOn(LocalDate.now());
      analyticsQuestion.setCount(indicatorList.size());
      analyticsQuestion.setIndicators(indicatorList);
      analyticsQuestion.setGoalRef(
          analyticsGoalsService.getAnalyticsGoal(analyticsQuestionRequest.getGoalId()));
      questionRepository.save(analyticsQuestion);
      log.info(
          "Successfully created analytics question '{}' with {} indicators.",
          analyticsQuestion.getName(),
          indicatorList.size());
    } catch (Exception e) {
      throw new DatabaseOperationException(
          "Error accessing database to create an analytics question", e);
    }
  }

  private List<Indicator> generateIndicatorList(List<String> indicatorsList) {
    List<Indicator> indicatorList = new ArrayList<>();
    for (String indicatorId : indicatorsList) {
      indicatorList.add(indicatorUtilityService.fetchIndicatorMethod(indicatorId));
    }
    log.info("Indicator list generated for question.");
    return indicatorList;
  }

  @Override
  public AnalyticsQuestionResponse getQuestion(String questionId) {
    AnalyticsQuestion foundQuestion = fetchQuestionMethod(questionId);
    return generateAnalyticsQuestionResponse(foundQuestion);
  }

  @Override
  public AnalyticsQuestion fetchQuestionMethod(String questionId) {
    try {
      Optional<AnalyticsQuestion> foundQuestion = questionRepository.findById(questionId);
      if (foundQuestion.isEmpty()) {
        throw new AnalyticsQuestionNotFoundException(
            "Question with id '" + questionId + "' not found");
      }
      log.info("Question found: {}", foundQuestion.get().getName());
      return foundQuestion.get();
    } catch (AnalyticsQuestionNotFoundException e) {
      throw e;
    } catch (Exception e) {
      throw new DatabaseOperationException("Could not fetch analytics question", e);
    }
  }

  @Cacheable("myQuestions")
  @Override
  public Page<AnalyticsQuestionResponse> getAllMyQuestions(
      HttpServletRequest request, int page, int size, String sortBy, String sortDirection) {
    User createdBy = tokenService.getUserFromToken(request);
    Sort sort =
        sortDirection.equalsIgnoreCase(Sort.Direction.ASC.name())
            ? Sort.by(sortBy).ascending()
            : Sort.by(sortBy).descending();
    Pageable pageable = PageRequest.of(page, size, sort);
    try {
      Page<AnalyticsQuestion> foundAnalyticsQuestionPage =
          questionRepository.findByCreatedBy_Id(new ObjectId(createdBy.getId()), pageable);

      List<AnalyticsQuestionResponse> analyticsQuestionResponseList = new ArrayList<>();
      log.info("Generating analytics question response...");
      for (AnalyticsQuestion analyticsQuestion : foundAnalyticsQuestionPage.getContent()) {
        analyticsQuestionResponseList.add(generateAnalyticsQuestionResponse(analyticsQuestion));
      }
      log.info("Found all user questions");
      return new PageImpl<>(
          analyticsQuestionResponseList, pageable, foundAnalyticsQuestionPage.getTotalElements());
    } catch (Exception e) {
      throw new DatabaseOperationException(
          "Error accessing database to get all analytics questions", e);
    }
  }

  private AnalyticsQuestionResponse generateAnalyticsQuestionResponse(
      AnalyticsQuestion analyticsAnalyticsQuestion) {
    try {
      List<IndicatorWithCodeResponse> indicatorWithCodeResponseList =
          indicatorService.getIndicatorDetailResponseList(
              analyticsAnalyticsQuestion.getIndicators());
      AnalyticsQuestionResponse analyticsQuestionResponse = new AnalyticsQuestionResponse();
      analyticsQuestionResponse.setId(analyticsAnalyticsQuestion.getId());
      analyticsQuestionResponse.setQuestion(analyticsAnalyticsQuestion.getName());
      analyticsQuestionResponse.setCount(analyticsAnalyticsQuestion.getCount());
      analyticsQuestionResponse.setCreatedOn(analyticsAnalyticsQuestion.getCreatedOn());
      analyticsQuestionResponse.setCreatedBy(analyticsAnalyticsQuestion.getCreatedBy().getName());
      analyticsQuestionResponse.setIndicators(
          indicatorWithCodeResponseList.isEmpty() ? null : indicatorWithCodeResponseList);
      analyticsQuestionResponse.setGoal(analyticsAnalyticsQuestion.getGoalRef().getCategory());
      return analyticsQuestionResponse;
    } catch (Exception e) {
      throw new ServiceException("Error generating analytics question response", e);
    }
  }

  @Override
  public void updateQuestion(
      HttpServletRequest request,
      String questionId,
      AnalyticsQuestionRequest analyticsQuestionRequest) {
    User userFromToken = tokenService.getUserFromToken(request);
    AnalyticsQuestion foundQuestion = fetchQuestionMethod(questionId);
    try {
      if (!foundQuestion.getCreatedBy().getId().equals(userFromToken.getId())) {
        throw new AnalyticsQuestionMethodNotAllowedException(
            "You do not have the permission to update question");
      }
      List<Indicator> indicatorList =
          generateIndicatorList(analyticsQuestionRequest.getIndicators());
      foundQuestion.setName(analyticsQuestionRequest.getQuestion());
      foundQuestion.setGoalRef(
          analyticsGoalsService.getAnalyticsGoal(analyticsQuestionRequest.getGoalId()));
      foundQuestion.setIndicators(indicatorList);
      foundQuestion.setCount(indicatorList.size());
      questionRepository.save(foundQuestion);
      log.info("Question with id '{}' updated.", foundQuestion.getId());
    } catch (AnalyticsQuestionMethodNotAllowedException e) {
      throw e;
    } catch (Exception e) {
      throw new DatabaseOperationException(
          "Error accessing database to update an analytics question", e);
    }
  }

  @Override
  public void deleteQuestion(HttpServletRequest request, String questionId) {
    User userFromToken = tokenService.getUserFromToken(request);
    AnalyticsQuestion foundQuestion = fetchQuestionMethod(questionId);
    try {
      if (!foundQuestion.getCreatedBy().getId().equals(userFromToken.getId())) {
        throw new AnalyticsQuestionMethodNotAllowedException(
            "You do not have the permission to delete question");
      }
      questionRepository.deleteById(questionId);
      log.info("Question with id '{}' deleted.", questionId);
    } catch (AnalyticsQuestionMethodNotAllowedException e) {
      throw e;
    } catch (Exception e) {
      throw new DatabaseOperationException(
          "Error accessing database to delete an analytics question", e);
    }
  }

  @Override
  public void validateQuestionForAvailability(String questionName) {
    try {
      boolean questionExists = questionRepository.existsByName(questionName);
      if (questionExists) {
        throw new AnalyticsQuestionAlreadyExistsException("Question already exists");
      }
      log.info("The question '{}' is available.", questionName);
    } catch (AnalyticsQuestionAlreadyExistsException e) {
      throw e;
    } catch (Exception e) {
      throw new DatabaseOperationException(
          "Error accessing database to validate an analytics question", e);
    }
  }

  @Override
  public String requestInteractiveQuestionCode(String questionId, HttpServletRequest request) {
    AnalyticsQuestion foundQuestion = fetchQuestionMethod(questionId);
    String baseUrl =
        String.format(
            "%s://%s:%d", request.getScheme(), request.getServerName(), request.getServerPort());
    String apiUrl = "/api/v1/code/questions?questionId=";
    String metaDataUrl = "' frameborder='0' height='500px' width='500px'";

    return "<iframe src='" + baseUrl + apiUrl + foundQuestion.getId() + metaDataUrl + " />";
  }

  @Cacheable("questions")
  @Override
  public Page<AnalyticsQuestionResponse> getAllAvailableQuestions(
      int page, int size, String sortBy, String sortDirection) {
    Sort sort =
        sortDirection.equalsIgnoreCase(Sort.Direction.ASC.name())
            ? Sort.by(sortBy).ascending()
            : Sort.by(sortBy).descending();
    Pageable pageable = PageRequest.of(page, size, sort);
    Page<AnalyticsQuestion> allQuestions = questionRepository.findAll(pageable);
    List<AnalyticsQuestionResponse> analyticsQuestionResponseList = new ArrayList<>();
    for (AnalyticsQuestion analyticsAnalyticsQuestion : allQuestions.getContent()) {
      analyticsQuestionResponseList.add(
          generateAnalyticsQuestionResponse(analyticsAnalyticsQuestion));
    }
    return new PageImpl<>(analyticsQuestionResponseList, pageable, allQuestions.getTotalElements());
  }
}
