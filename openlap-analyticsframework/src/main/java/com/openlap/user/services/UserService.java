package com.openlap.user.services;

import com.openlap.analytics_statements.dtos.request.LrsConsumerRequest;
import com.openlap.user.dto.request.ChangePasswordRequest;
import com.openlap.user.dto.request.UpdateEmailRequest;
import com.openlap.user.dto.request.UpdateProfileRequest;
import com.openlap.user.dto.response.AdminUserResponse;
import com.openlap.user.dto.response.UserResponse;
import com.openlap.user.dto.response.utils.LrsConsumerResponse;
import com.openlap.user.entities.User;
import java.util.List;
import javax.servlet.http.HttpServletRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface UserService {

  User getUserByEmail(String userEmail);

  /** Lists all users (admin), paginated, exposing safe fields only (id, name, email, roles). */
  Page<AdminUserResponse> listUsers(Pageable pageable);

  UserResponse getUserDetails(HttpServletRequest request);

  List<LrsConsumerResponse> getLrsConsumerList(HttpServletRequest request);

  void getNewLrsToLrsConsumerList(
      HttpServletRequest request, LrsConsumerRequest lrsConsumerRequest);

  void deleteMyLrsConsumer(HttpServletRequest request, String lrsConsumerId);

  UserResponse updateProfile(HttpServletRequest request, UpdateProfileRequest updateProfileRequest);

  UserResponse updateEmail(HttpServletRequest request, UpdateEmailRequest updateEmailRequest);

  void changePassword(HttpServletRequest request, ChangePasswordRequest changePasswordRequest);
}
