package com.openlap.analytics_module.services;

import com.openlap.analytics_module.dto.requests.analytics_goal.AnalyticsGoalRequest;
import com.openlap.analytics_module.dto.requests.analytics_goal.AnalyticsGoalStatusRequest;
import com.openlap.analytics_module.entities.AnalyticsGoal;
import java.util.List;
import javax.servlet.http.HttpServletRequest;

public interface AnalyticsGoalsService {
  AnalyticsGoal createAnalyticsGoal( AnalyticsGoalRequest goal);

  List<AnalyticsGoal> getAllGoals();

  List<AnalyticsGoal> getAllActiveAnalyticsGoals();

  void populateAnalyticsGoal();

  void updateAnalyticsGoal(String id, AnalyticsGoalRequest goalId);

  void deleteAnalyticsGoal(String goalId);

  AnalyticsGoal getAnalyticsGoal(String goalId);

  void updateAnalyticsGoalStatus(AnalyticsGoalStatusRequest analyticsGoalStatusRequest);
}
