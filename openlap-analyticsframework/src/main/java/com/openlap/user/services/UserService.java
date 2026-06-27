package com.openlap.user.services;

import com.openlap.analytics_statements.dtos.request.LrsConsumerRequest;
import com.openlap.user.dto.request.ChangePasswordRequest;
import com.openlap.user.dto.request.UpdateEmailRequest;
import com.openlap.user.dto.request.UpdateProfileRequest;
import com.openlap.user.dto.response.UserResponse;
import com.openlap.user.dto.response.utils.LrsConsumerResponse;
import com.openlap.user.entities.User;
import java.util.List;
import javax.servlet.http.HttpServletRequest;

public interface UserService {

  User getUserByEmail(String userEmail);

  UserResponse getUserDetails(HttpServletRequest request);

  List<LrsConsumerResponse> getLrsConsumerList(HttpServletRequest request);

  void getNewLrsToLrsConsumerList(
      HttpServletRequest request, LrsConsumerRequest lrsConsumerRequest);

  void deleteMyLrsConsumer(HttpServletRequest request, String lrsConsumerId);

  UserResponse updateProfile(HttpServletRequest request, UpdateProfileRequest updateProfileRequest);

  UserResponse updateEmail(HttpServletRequest request, UpdateEmailRequest updateEmailRequest);

  void changePassword(HttpServletRequest request, ChangePasswordRequest changePasswordRequest);
}
