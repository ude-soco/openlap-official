package com.openlap.analytics_technique.repositories;

import com.openlap.analytics_technique.entities.AnalyticsTechnique;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface AnalyticsTechniqueRepository extends MongoRepository<AnalyticsTechnique, String> {
  List<AnalyticsTechnique> findAllByFileName(String fileName);
}
