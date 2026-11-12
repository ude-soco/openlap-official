package com.openlap.isc_module.repositories;

import com.openlap.isc_module.entities.IndicatorSpecificationCard;
import org.bson.types.ObjectId;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

public interface IscRepository extends MongoRepository<IndicatorSpecificationCard, String> {
  @Query("{ 'createdBy.$id' : ?0 }")
  Page<IndicatorSpecificationCard> findByCreatedBy_Id(ObjectId objectId, Pageable pageable);
}
