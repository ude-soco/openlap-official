package com.openlap.user.services;

import com.openlap.user.dto.request.UserRequest;

public interface UserRegisterService {
  void createAdmin(UserRequest user);

  void registerUser(UserRequest user);
}
