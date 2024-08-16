package com.openlap.analytics_module.services.impl;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.openlap.analytics_module.dto.requests.analytics_goal.AnalyticsGoalRequest;
import com.openlap.analytics_module.dto.requests.analytics_goal.AnalyticsGoalStatusRequest;
import com.openlap.analytics_module.dto.requests.analytics_goal.GoalStatus;
import com.openlap.analytics_module.entities.AnalyticsGoal;
import com.openlap.analytics_module.exceptions.analytics_goals.AnalyticsGoalAlreadyExistsException;
import com.openlap.analytics_module.exceptions.analytics_goals.AnalyticsQuestionNotFoundException;
import com.openlap.analytics_module.repositories.AnalyticsGoalsRepository;
import com.openlap.analytics_module.services.AnalyticsGoalsService;
import com.openlap.exception.DatabaseOperationException;
import com.openlap.exception.ServiceException;
import com.openlap.user.entities.User;
import com.openlap.user.services.TokenService;
import java.io.*;
import java.lang.reflect.Type;
import java.util.List;
import java.util.Optional;
import javax.servlet.http.HttpServletRequest;
import javax.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class AnalyticsGoalsServiceImpl implements AnalyticsGoalsService {
  @Value("${analytics.goals.file}")
  private String analyticsGoalsFile;

  private final AnalyticsGoalsRepository analyticsGoalsRepository;
  private final TokenService tokenService;

  @Override
  public AnalyticsGoal createAnalyticsGoal(
      HttpServletRequest request, AnalyticsGoalRequest analyticsGoalRequest) {
    try {
      String goalName = analyticsGoalRequest.getName();
      boolean goalExists = analyticsGoalsRepository.existsByName(goalName);
      if (goalExists) {
        throw new AnalyticsGoalAlreadyExistsException(
            "Analytics goal '" + goalName + "' already exists.");
      }
      User createdBy = tokenService.getUserFromToken(request);
      return analyticsGoalsRepository.save(
          new AnalyticsGoal(
              null,
              goalName,
              analyticsGoalRequest.getDescription(),
              createdBy.getName(),
              analyticsGoalRequest.getStatus().equals(GoalStatus.ACTIVE)));
    } catch (AnalyticsQuestionNotFoundException e) {
      throw e;
    } catch (Exception e) {
      throw new DatabaseOperationException("Could not access database to save analytics goal", e);
    }
  }

  @Override
  public List<AnalyticsGoal> getAllGoals() {
    try {
      return analyticsGoalsRepository.findAll();
    } catch (Exception e) {
      throw new DatabaseOperationException("Could not find analytics goals in the database", e);
    }
  }

  @Override
  public List<AnalyticsGoal> getAllActiveAnalyticsGoals() {
    try {
      return analyticsGoalsRepository.findAllByActiveTrue();
    } catch (Exception e) {
      throw new DatabaseOperationException(
          "Could not access database to find the active analytics goals.", e);
    }
  }

  @Override
  public void populateAnalyticsGoal() {
    List<AnalyticsGoal> existingGoals = getAllGoals();
    Gson gson = new Gson();

    try (InputStream inputStream = new ClassPathResource(analyticsGoalsFile).getInputStream();
        BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream))) {

      StringBuilder sb = new StringBuilder();
      String line;
      while ((line = reader.readLine()) != null) {
        sb.append(line);
      }

      Type type = new TypeToken<List<AnalyticsGoal>>() {}.getType();
      List<AnalyticsGoal> newGoals = gson.fromJson(sb.toString(), type);

      for (AnalyticsGoal goal : newGoals) {
        if (existingGoals.stream().noneMatch(c -> c.getName().equals(goal.getName()))) {
          analyticsGoalsRepository.save(goal);
          log.warn("New goal saved: {}", goal.getName());
        } else {
          log.warn("Goal '{}' already exists. Skipped saving...", goal.getName());
        }
      }
    } catch (IOException e) {
      throw new ServiceException("Failed to populate analytics goals from SampleGoal.json", e);
    }
  }

  @Override
  public void updateAnalyticsGoal(String goalId, AnalyticsGoalRequest analyticsGoalRequest) {
    try {
      log.info("Looking up analytics goal with id {} to update", goalId);
      Optional<AnalyticsGoal> analyticsGoalFound = analyticsGoalsRepository.findById(goalId);
      if (analyticsGoalFound.isEmpty()) {
        throw new AnalyticsQuestionNotFoundException(
            "Analytics Goal with id '" + goalId + "' not found.");
      }
      log.info("Analytics Goal found with name: '{}'", analyticsGoalFound.get().getName());
      analyticsGoalFound.get().setName(analyticsGoalRequest.getName());
      analyticsGoalFound.get().setDescription(analyticsGoalRequest.getDescription());
      analyticsGoalFound
          .get()
          .setActive(analyticsGoalRequest.getStatus().equals(GoalStatus.ACTIVE));
      analyticsGoalsRepository.save(analyticsGoalFound.get());
      log.info("Analytics Goal updated.");
    } catch (AnalyticsQuestionNotFoundException e) {
      throw e;
    } catch (Exception e) {
      throw new DatabaseOperationException("Could not access database to update analytics goal", e);
    }
  }

  @Override
  public void deleteAnalyticsGoal(String goalId) {
    try {
      log.info("Looking up analytics goal with id {} to delete", goalId);
      Optional<AnalyticsGoal> analyticsGoalFound = analyticsGoalsRepository.findById(goalId);

      if (analyticsGoalFound.isEmpty()) {
        throw new AnalyticsQuestionNotFoundException(
            "Analytics Goal with id '" + goalId + "' not found.");
      }
      analyticsGoalsRepository.deleteById(analyticsGoalFound.get().getId());
      log.info("Analytics Goal deleted: '{}'", analyticsGoalFound.get().getName());
    } catch (AnalyticsQuestionNotFoundException e) {
      throw e;
    } catch (Exception e) {
      throw new DatabaseOperationException(
          "Could not access database to delete the analytics goal.", e);
    }
  }

  @Override
  public AnalyticsGoal getAnalyticsGoal(String goalId) {
    try {
      log.info("Looking up analytics goal with id {}", goalId);
      Optional<AnalyticsGoal> foundGoal = analyticsGoalsRepository.findById(goalId);
      if (foundGoal.isEmpty()) {
        throw new AnalyticsQuestionNotFoundException(
            "Analytics goal with id '" + goalId + "' not found.");
      }
      log.info("Analytics Goal found: '{}'", foundGoal.get().getName());
      return foundGoal.get();
    } catch (AnalyticsQuestionNotFoundException e) {
      throw e;
    } catch (Exception e) {
      throw new DatabaseOperationException("Could not access database to find analytics goal.", e);
    }
  }

  @Override
  public void updateAnalyticsGoalStatus(AnalyticsGoalStatusRequest analyticsGoalStatusRequest) {
    AnalyticsGoal analyticsGoalFound = getAnalyticsGoal(analyticsGoalStatusRequest.getGoalId());
    analyticsGoalFound.setActive(analyticsGoalStatusRequest.getStatus().equals(GoalStatus.ACTIVE));
    try {
      analyticsGoalsRepository.save(analyticsGoalFound);
    } catch (Exception e) {
      throw new DatabaseOperationException(
          "Could not access database to update analytics goal status", e);
    }
  }
}
