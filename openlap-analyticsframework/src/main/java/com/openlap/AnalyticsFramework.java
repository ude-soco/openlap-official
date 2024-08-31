package com.openlap;

import com.openlap.analytics_engine.services.EngineService;
import com.openlap.user.dto.request.RoleRequest;
import com.openlap.user.dto.request.UserRequest;
import com.openlap.user.entities.RoleType;
import com.openlap.user.exception.user.EmailAlreadyTakenException;
import com.openlap.user.services.UserRegisterService;
import com.openlap.user.services.UserRoleService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@EnableCaching
@SpringBootApplication
@Slf4j
public class AnalyticsFramework {

  @Value("${user.admin.name}")
  String adminName;

  @Value("${user.admin.email}")
  String adminEmail;

  @Value("${user.admin.password}")
  String adminPassword;

  public static void main(String[] args) {
    SpringApplication.run(AnalyticsFramework.class, args);
  }

  @Bean
  public BCryptPasswordEncoder bCryptPasswordEncoder() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  CommandLineRunner run(
      UserRegisterService userRegisterService,
      UserRoleService userRoleService,
      EngineService engineService) {
    return args -> {
      userRoleService.saveRole(new RoleRequest(RoleType.ROLE_USER));
      userRoleService.saveRole(new RoleRequest(RoleType.ROLE_SUPER_ADMIN));
      userRoleService.saveRole(new RoleRequest(RoleType.ROLE_DATA_PROVIDER));
      userRoleService.saveRole(new RoleRequest(RoleType.ROLE_USER_WITHOUT_LRS));

      try {
        UserRequest adminUserRequest = new UserRequest();
        adminUserRequest.setName(adminName);
        adminUserRequest.setEmail(adminEmail);
        adminUserRequest.setPassword(adminPassword);
        adminUserRequest.setConfirmPassword(adminPassword);
        adminUserRequest.setRole(RoleType.ROLE_SUPER_ADMIN);
        userRegisterService.createAdmin(adminUserRequest);
        engineService.initializeDatabase();
      } catch (EmailAlreadyTakenException e) {
        log.warn("Skipping Admin user creation...");
      }
    };
  }
}
