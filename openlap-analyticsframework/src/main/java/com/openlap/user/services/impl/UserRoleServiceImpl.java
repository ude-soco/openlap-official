package com.openlap.user.services.impl;

import com.openlap.exception.ServiceException;
import com.openlap.user.dto.request.RoleRequest;
import com.openlap.user.entities.Role;
import com.openlap.user.entities.RoleType;
import com.openlap.user.entities.User;
import com.openlap.user.exception.role.RoleNotFoundException;
import com.openlap.user.exception.user.UserNotFoundException;
import com.openlap.user.repositories.RoleRepository;
import com.openlap.user.repositories.UserRepository;
import com.openlap.user.services.UserRoleService;
import com.openlap.user.services.UserService;
import javax.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class UserRoleServiceImpl implements UserRoleService {
  private final RoleRepository roleRepository;
  private final UserRepository userRepository;
  private final UserService userService;

  @Override
  public void saveRole(RoleRequest role) {
    log.info("Adding a new role '{}'", role.getName());
    try {
      Role foundRole = roleRepository.findByName(role.getName());
      if (foundRole == null) {
        roleRepository.save(new Role(null, role.getName()));
        log.info("New role '{}' added.", role.getName());
      } else {
        log.info("Role '{}' already exists", role.getName());
      }
    } catch (Exception e) {
      throw new ServiceException("Error saving role", e);
    }
  }

  @Override
  public void addRoleToUser(String userEmail, RoleType roleName) {
    log.info("Adding a role '{}' to user with email '{}'", roleName, userEmail);
    try {
      User user = userService.getUserByEmail(userEmail);
      if (user.getRoles() != null) {
        Role role = roleRepository.findByName(roleName);
        if (role == null) {
          log.warn("Role '{}' not found", roleName);
          throw new RoleNotFoundException("Role '" + roleName + "' not found");
        }
        if (!user.getRoles().contains(role)) {
          user.getRoles().add(role);
          userRepository.save(user);
          log.info("User with email '{}' received a new role {}", userEmail, roleName);
        } else {
          log.info("User with email '{}' already has the role {}", userEmail, roleName);
        }
      }
    } catch (UserNotFoundException | RoleNotFoundException e) {
      throw e;
    } catch (Exception e) {
      throw new ServiceException("Error adding role to user", e);
    }
  }
}
