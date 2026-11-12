package com.openlap.analytics_module.repositories;

import com.openlap.analytics_module.entities.AnalyticsQuestion;
import org.bson.types.ObjectId;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

public interface QuestionRepository extends MongoRepository<AnalyticsQuestion, String> {
  boolean existsByName(String questionName);

  @Query("{ 'createdBy.$id' : ?0 }")
  Page<AnalyticsQuestion> findByCreatedBy_Id(ObjectId userId, Pageable pageable);
}
