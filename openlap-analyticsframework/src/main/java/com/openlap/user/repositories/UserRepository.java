package com.openlap.user.repositories;

import com.openlap.user.entities.User;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface UserRepository extends MongoRepository<User, String> {
  User findByEmail(String userEmail);
}
