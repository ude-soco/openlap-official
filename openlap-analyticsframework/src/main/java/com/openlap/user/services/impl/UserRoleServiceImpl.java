package com.openlap.user.services.impl;

import com.openlap.infrastructure.exception.ServiceException;
import com.openlap.user.dto.request.RoleRequest;
import com.openlap.user.entities.Role;
import com.openlap.user.entities.RoleType;
import com.openlap.user.entities.User;
import com.openlap.user.exception.role.LastSuperAdminException;
import com.openlap.user.exception.role.RoleNotAllowedException;
import com.openlap.user.exception.role.RoleNotFoundException;
import com.openlap.user.exception.user.UserNotFoundException;
import com.openlap.user.repositories.RoleRepository;
import com.openlap.user.repositories.UserRepository;
import com.openlap.user.services.UserRoleService;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import javax.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bson.types.ObjectId;
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

  @Override
  public void replaceUserRoles(User user, Set<RoleType> roles) {
    if (roles == null || roles.isEmpty()) {
      throw new RoleNotAllowedException("At least one role is required.");
    }
    if (roles.contains(RoleType.ROLE_USER) && roles.contains(RoleType.ROLE_USER_WITHOUT_LRS)) {
      throw new RoleNotAllowedException(
          "ROLE_USER and ROLE_USER_WITHOUT_LRS cannot be combined.");
    }

    // Guardrail: never remove the last super admin. This also covers an admin demoting their own
    // account — if they are the only super admin the removal is blocked.
    boolean userIsSuperAdmin = userHasRole(user, RoleType.ROLE_SUPER_ADMIN);
    if (userIsSuperAdmin
        && !roles.contains(RoleType.ROLE_SUPER_ADMIN)
        && countSuperAdmins() <= 1) {
      throw new LastSuperAdminException("Cannot remove the last super admin.");
    }

    List<Role> newRoles = new ArrayList<>();
    for (RoleType roleType : roles) {
      Role role = roleRepository.findByName(roleType);
      if (role == null) {
        // Roles are seeded at startup; create defensively if one is somehow missing.
        role = roleRepository.save(new Role(null, roleType));
      }
      newRoles.add(role);
    }
    user.setRoles(newRoles);
    userRepository.save(user);
    log.info("Replaced roles for user with email '{}' -> {}", user.getEmail(), roles);
  }

  private static boolean userHasRole(User user, RoleType roleType) {
    return user.getRoles() != null
        && user.getRoles().stream()
            .anyMatch(role -> role != null && role.getName() == roleType);
  }

  private long countSuperAdmins() {
    Role superAdmin = roleRepository.findByName(RoleType.ROLE_SUPER_ADMIN);
    if (superAdmin == null || superAdmin.getId() == null) {
      return 0;
    }
    return userRepository.countByRoleId(new ObjectId(superAdmin.getId()));
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
