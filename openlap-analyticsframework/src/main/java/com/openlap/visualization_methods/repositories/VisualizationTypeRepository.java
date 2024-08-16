package com.openlap.visualization_methods.repositories;

import com.openlap.visualization_methods.entities.VisType;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface VisualizationTypeRepository extends MongoRepository<VisType, String> {
  List<VisType> findByVisualizationLib_id(String type);
}
