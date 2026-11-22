package com.openlap.analytics_technique.repositories;

import com.openlap.analytics_technique.entities.AnalyticsTechnique;
import java.util.List;
import org.bson.Document;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.data.mongodb.repository.Update;

public interface AnalyticsTechniqueRepository extends MongoRepository<AnalyticsTechnique, String> {
  List<AnalyticsTechnique> findAllByFileName(String fileName);

  @Query("{ '_id': ?0, 'fileName': ?1, 'implementingClass': ?2, 'artifactId': null, 'installationId': null }")
  @Update("{ '$set': { 'analyticsMetadata': ?3 } }")
  void refreshLocalMetadata(String id, String fileName, String implementingClass, Document metadata);
}
