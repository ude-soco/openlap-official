package com.openlap.analytics_module.repositories;

import com.openlap.analytics_module.entities.Indicator;
import java.util.List;
import org.bson.types.ObjectId;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

public interface IndicatorRepository extends MongoRepository<Indicator, String> {
  @Query("{ 'createdBy.$id': ?0, 'name': { $regex: ?1, $options: 'i' } }")
  List<Indicator> findByCreatedByAndNameStartingWith(ObjectId userId, String namePrefix);

  @Query("{ 'createdBy.$id' : ?0 }")
  Page<Indicator> findByCreatedBy_Id(ObjectId userId, Pageable pageable);

  @Query("{ 'createdBy.$id' : ?0, 'indicatorType': 'BASIC' }")
  Page<Indicator> findBasicIndicatorByCreatedBy_Id(ObjectId userId, Pageable pageable);

  @Query("{ 'createdBy.$id': ?0, 'analyticsTechniqueReference.analyticsTechnique.$id': ?1, '_id' : { $ne : ?2 }  }")
//  @Query("{ 'createdBy.$id': ?0, 'analyticsTechniqueReference.analyticsTechnique.$id': ?1 }")
  Page<Indicator> findByCreatedByAndAnalyticsTechniqueId(
      ObjectId userId, ObjectId analyticsTechniqueId, ObjectId excludeId, Pageable pageable);
}
