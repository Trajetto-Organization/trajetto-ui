import { describe, expect, it } from "vitest";

import { socketLogoutReason } from "@/app/(protected)/_components/layout/protected-provider/notifications-provider/socket-logout-reason";

/**
 * The API's `securityAction` reasons that end the session on the spot.
 *
 * `role_changed` (a role, company or linked driver changed, USR-EDIT-1) was
 * not mapped: it fell through to the `/user/me` re-check, which met a
 * session already ended in the database, got 401 and told the user "Sua
 * sessão expirou" — about a change an administrator made on purpose. Then it
 * was mapped to `permissions_changed`, whose words ("Suas permissões
 * mudaram") describe a reload the API did not do: the session was ended.
 *
 * `business_inactive` and `branch_inactive` (the socket sweep and the
 * company toggle, decision 4.1) log out with their own words too, without
 * depending on the re-check reaching the API. So do `driver_inactive`
 * (update-driver, and the sweep for AUTH_DRIVER_INACTIVE /
 * AUTH_DRIVER_TENANT_MISMATCH) and `no_permissions` (the sweep for
 * AUTH_PROFILE_NOT_CONFIGURED): they were left to the re-check, and a 5xx
 * or a timeout there kept a deactivated driver on the connection screen
 * instead of "Seu cadastro foi inativado".
 */
describe("a securityAction that ends the session", () => {
  it.each([
    ["access_revoked", "user_revoked"],
    ["access_denied", "access_denied"],
    ["user_updated", "session_expired"],
    ["role_changed", "role_changed"],
    ["business_inactive", "business_inactive"],
    ["branch_inactive", "branch_inactive"],
    ["driver_inactive", "driver_inactive"],
    ["no_permissions", "no_user_permission"],
  ])("%s logs out as %s", (reason, expected) => {
    expect(socketLogoutReason(reason)).toBe(expected);
  });

  it("leaves the others to the /user/me re-check", () => {
    // permissions_changed keeps the session: the re-check reloads the
    // permissions (decision 4.6).
    expect(socketLogoutReason("permissions_changed")).toBeUndefined();
    expect(socketLogoutReason("algo_novo")).toBeUndefined();
  });

  it("never resolves a name the object prototype carries", () => {
    // A plain Record lookup answered Object's constructor for this, and the
    // provider would have called forceLogout with a function.
    expect(socketLogoutReason("constructor")).toBeUndefined();
    expect(socketLogoutReason("__proto__")).toBeUndefined();
    expect(socketLogoutReason(undefined)).toBeUndefined();
  });
});
