package com.openlap.analytics_statements.repositories;

import com.openlap.analytics_statements.entities.LrsClient;
import javax.transaction.Transactional;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

public interface LrsClientRepository extends MongoRepository<LrsClient, String> {

  @Transactional
  @Query(value = "{ 'lrs_id': ?0 }")
  LrsClient findByLrsId(ObjectId lrsId);

  @Transactional
  @Query(value = "{ 'lrs_id': ?0 }", delete = true)
  void deleteByLrsId(ObjectId lrsId);
}
