package com.openlap.analytics_module.repositories;

import com.openlap.analytics_module.entities.AnalyticsGoal;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface AnalyticsGoalsRepository extends MongoRepository<AnalyticsGoal, String> {
  List<AnalyticsGoal> findAllByActiveTrue();

  boolean existsByCategory(String name);
}
