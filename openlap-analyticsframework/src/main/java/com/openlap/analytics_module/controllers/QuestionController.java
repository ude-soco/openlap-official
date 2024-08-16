package com.openlap.analytics_module.controllers;

import com.openlap.analytics_module.dto.requests.analytics_question.AnalyticsQuestionRequest;
import com.openlap.analytics_module.services.QuestionService;
import com.openlap.response.ApiSuccess;
import javax.servlet.http.HttpServletRequest;
import javax.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/questions")
@RequiredArgsConstructor
@Validated
public class QuestionController {
  private final QuestionService questionService;

  @PostMapping("/create")
  public ResponseEntity<?> createQuestion(
      HttpServletRequest request, @Valid @RequestBody AnalyticsQuestionRequest question) {
    questionService.createQuestion(request, question);
    HttpStatus status = HttpStatus.CREATED;
    return ResponseEntity.status(status).body(new ApiSuccess(status, "Question created."));
  }

  @GetMapping("/{questionId}")
  public ResponseEntity<?> getQuestion(@PathVariable String questionId) {
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(new ApiSuccess(status, "Question found.", questionService.getQuestion(questionId)));
  }

  /**
   * @param sortBy possible options: name, goalRef, createdOn
   * @param sortDirection possible options: asc, dsc
   */
  @GetMapping("/my")
  public ResponseEntity<?> getAllMyQuestions(
      HttpServletRequest request,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "10") int size,
      @RequestParam(defaultValue = "createdOn") String sortBy,
      @RequestParam(defaultValue = "asc") String sortDirection) {

    // Set the minimum and maximum size values
    int minSize = 1;
    int maxSize = 100;

    // Enforce the minimum and maximum size values
    if (size < minSize) {
      size = minSize;
    } else if (size > maxSize) {
      size = maxSize;
    }

    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(
            new ApiSuccess(
                status,
                "All my questions found.",
                questionService.getAllMyQuestions(request, page, size, sortBy, sortDirection)));
  }

  /**
   * @param sortBy possible options: name, createdBy, goalRef, createdOn
   * @param sortDirection possible options: asc, dsc
   */
  @GetMapping("/all")
  public ResponseEntity<?> getPoolOfQuestions(
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "10") int size,
      @RequestParam(defaultValue = "createdOn") String sortBy,
      @RequestParam(defaultValue = "asc") String sortDirection) {
    // Capping the minimum page size
    if (page < 0) page = 0;

    // Minimum and maximum size values
    int minSize = 1;
    int maxSize = 100;

    // Capping the minimum and maximum size values
    if (size < minSize) {
      size = minSize;
    } else if (size > maxSize) {
      size = maxSize;
    }
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(
            new ApiSuccess(
                status,
                "All questions found.",
                questionService.getAllAvailableQuestions(page, size, sortBy, sortDirection)));
  }

  @PutMapping("/{questionId}")
  public ResponseEntity<?> updateQuestion(
      HttpServletRequest request,
      @PathVariable String questionId,
      @Valid @RequestBody AnalyticsQuestionRequest analyticsQuestion) {
    questionService.updateQuestion(request, questionId, analyticsQuestion);
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(new ApiSuccess(status, "Question updated successfully."));
  }

  @DeleteMapping("/{questionId}")
  public ResponseEntity<?> deleteQuestion(
      HttpServletRequest request, @PathVariable String questionId) {
    questionService.deleteQuestion(request, questionId);
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(new ApiSuccess(status, "Question deleted successfully."));
  }

  @GetMapping("/exists")
  public ResponseEntity<?> validateQuestionForAvailability(@RequestParam String questionName) {
    questionService.validateQuestionForAvailability(questionName);
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status).body(new ApiSuccess(status, "Question available"));
  }

  @GetMapping("/{questionId}/code")
  public ResponseEntity<?> requestInteractiveQuestionCode(
      @PathVariable String questionId, HttpServletRequest request) {
    HttpStatus status = HttpStatus.OK;
    return ResponseEntity.status(status)
        .body(
            new ApiSuccess(
                status,
                "Interactive Question Code found.",
                questionService.requestInteractiveQuestionCode(questionId, request)));
  }
}
