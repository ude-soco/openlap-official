import { test } from "node:test";
import assert from "node:assert/strict";
import RoleTypes from "../../account-manager/utils/enums/role-types.js";
import { ADMIN_HOME_CARD_ACCESS, canViewHomeCard } from "./home-access.js";

test("administrative home cards are visible to a super admin", () => {
  assert.equal(canViewHomeCard(ADMIN_HOME_CARD_ACCESS, [RoleTypes.admin]), true);
});

test("another assigned role does not hide an admin's home cards", () => {
  for (const role of [RoleTypes.user, RoleTypes.userWithoutLRS, RoleTypes["data provider"]]) {
    assert.equal(canViewHomeCard(ADMIN_HOME_CARD_ACCESS, [role, RoleTypes.admin]), true, role);
  }
  assert.equal(canViewHomeCard(ADMIN_HOME_CARD_ACCESS, Object.values(RoleTypes)), true);
});

test("administrative home cards remain hidden from non-admin accounts", () => {
  for (const roles of [[], [RoleTypes.user], [RoleTypes.userWithoutLRS], [RoleTypes["data provider"]], [RoleTypes.user, RoleTypes["data provider"]]]) {
    assert.equal(canViewHomeCard(ADMIN_HOME_CARD_ACCESS, roles), false);
  }
});

test("existing home cards retain their disabled-role behavior", () => {
  const card = { disabledRoles: [RoleTypes.admin, RoleTypes["data provider"]] };
  assert.equal(canViewHomeCard(card, [RoleTypes.user]), true);
  assert.equal(canViewHomeCard(card, [RoleTypes.userWithoutLRS]), true);
  assert.equal(canViewHomeCard(card, [RoleTypes.admin]), false);
  assert.equal(canViewHomeCard(card, [RoleTypes["data provider"]]), false);
});
