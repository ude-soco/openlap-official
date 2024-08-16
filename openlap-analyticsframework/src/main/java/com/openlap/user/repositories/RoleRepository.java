package com.openlap.user.repositories;

import com.openlap.user.entities.Role;

import com.openlap.user.entities.RoleType;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface RoleRepository extends MongoRepository<Role, String> {
  Role findByName(RoleType name);
}
