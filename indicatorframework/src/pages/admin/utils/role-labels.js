// Friendly display labels for the backend RoleType values (read-only display only).
export const ROLE_LABELS = {
  ROLE_SUPER_ADMIN: "Super admin",
  ROLE_USER: "User",
  ROLE_USER_WITHOUT_LRS: "User (no LRS)",
  ROLE_DATA_PROVIDER: "Data provider",
};

export const roleLabel = (role) => ROLE_LABELS[role] || role;
