import RoleTypes from "../../account-manager/utils/enums/role-types.js";

// Admin access is additive: another assigned role must not hide these cards.
export const ADMIN_HOME_CARD_ACCESS = {
  allowedRoles: [RoleTypes.admin],
  disabledRoles: [],
};

export function canViewHomeCard(card, roles = []) {
  if (card.allowedRoles && !roles.some((role) => card.allowedRoles.includes(role))) return false;
  return !roles.some((role) => (card.disabledRoles || []).includes(role));
}
