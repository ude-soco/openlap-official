package com.openlap.visualization_methods.repositories;

import com.openlap.visualization_methods.entities.VisLibrary;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface VisualizationLibraryRepository extends MongoRepository<VisLibrary, String> {

  VisLibrary findByFrameworkLocation(String location);

  List<VisLibrary> findAllByFrameworkLocation(String location);
}
