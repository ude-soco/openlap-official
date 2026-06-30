package com.openlap.user.repositories;

import com.openlap.user.entities.User;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

public interface UserRepository extends MongoRepository<User, String> {
  User findByEmail(String userEmail);

  boolean existsByEmail(String email);

  /**
   * Counts users that hold the role with the given id. Roles are stored as {@code @DBRef}s, so this
   * addresses the embedded {@code roles.$id} path with the role's ObjectId (a derived query cannot
   * target a DBRef's {@code $id}). Used to protect the last super admin.
   */
  @Query(value = "{ 'roles.$id' : ?0 }", count = true)
  long countByRoleId(ObjectId roleId);
}
