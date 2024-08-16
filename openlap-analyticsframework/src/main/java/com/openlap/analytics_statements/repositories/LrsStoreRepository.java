package com.openlap.analytics_statements.repositories;

import com.openlap.analytics_statements.entities.LrsStore;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface LrsStoreRepository extends MongoRepository<LrsStore, String> {
  LrsStore findByTitle(String title);
}
