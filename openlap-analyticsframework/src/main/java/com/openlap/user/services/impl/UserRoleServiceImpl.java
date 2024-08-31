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
  public void addRoleToUser(User user, RoleType roleName) {
    modifyUserRole(user, roleName, true);
  }

  @Override
  public void removeRoleFromUser(User user, RoleType roleName) {
    modifyUserRole(user, roleName, false);
  }

  private void modifyUserRole(User user, RoleType roleName, boolean addRole) {
    String action = addRole ? "Adding" : "Removing";
    log.info("{} a role '{}' to/from user with email '{}'", action, roleName, user.getEmail());
    try {
      if (user.getRoles() != null) {
        Role role = roleRepository.findByName(roleName);
        if (role == null) {
          log.warn("Role '{}' not found", roleName);
          throw new RoleNotFoundException("Role '" + roleName + "' not found");
        }

        boolean roleExists = user.getRoles().contains(role);

        if (addRole && !roleExists) {
          user.getRoles().add(role);
          userRepository.save(user);
          log.info("User with email '{}' received a new role '{}'", user.getEmail(), roleName);
        } else if (!addRole && roleExists) {
          user.getRoles().remove(role);
          userRepository.save(user);
          log.info("User with email '{}' had the role '{}' removed", user.getEmail(), roleName);
        } else {
          log.info(
              "User with email '{}' {} has the role '{}'",
              user.getEmail(),
              addRole ? "already" : "does not",
              roleName);
        }
      } else {
        log.warn("User with email '{}' has no roles assigned", user.getEmail());
      }
    } catch (UserNotFoundException | RoleNotFoundException e) {
      throw e;
    } catch (Exception e) {
      throw new ServiceException("Error modifying role for user", e);
    }
  }
}
