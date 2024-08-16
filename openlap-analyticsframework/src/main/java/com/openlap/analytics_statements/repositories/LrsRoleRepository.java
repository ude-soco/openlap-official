package com.openlap.analytics_statements.repositories;

import com.openlap.analytics_statements.entities.LrsRole;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface LrsRoleRepository extends MongoRepository<LrsRole, String> {
  LrsRole findByTitle(String title);
}
