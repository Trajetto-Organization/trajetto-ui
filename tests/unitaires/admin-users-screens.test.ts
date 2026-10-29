import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { countWithShare, scopedBusinessId } from "@/features/user/lib/scope";
import {
  changedMasterFields,
  changedUserFields,
  editEndsSessions,
  masterFormValuesOf,
  revokeBlockedReason,
  roleOptionsFor,
  userFormValuesOf,
  userLinkIssue,
  userStatsData,
  type UserFormValues,
} from "@/features/user/lib/user-rules";
import {
  MASTER_USER_TABLE,
  USER_TABLE,
  masterUserListQuery,
  userListQuery,
} from "@/features/user/server-table";
import { masterUserStats, userStats } from "@/features/user/lib/stats-config";

import {
  countLabel,
  deleteProfileBlockedReason,
  profileNameChanged,
} from "@/features/profile-access/lib/profile-access-rules";
import {
  PROFILE_ACCESS_TABLE,
  profileAccessListQuery,
} from "@/features/profile-access/server-table";

import {
  changedPermissionFields,
  permissionFormIssue,
  permissionFormValuesOf,
  permissionStatsData,
  resourceLabel,
  resourceOptions,
  withReadRule,
} from "@/features/permission/lib/permission-rules";
import {
  PERMISSION_TABLE,
  permissionListQuery,
} from "@/features/permission/server-table";
import { permissionStats } from "@/features/permission/lib/stats-config";

/**
 * Usuários, perfis de acesso, permissões e masters: one implementation each
 * for /admin and /dashboard (decision 8.7). The old copies drifted — the
 * /admin ones listed every company mixed, asked for the company inside each
 * dialog, offered actions without checking permissions, counted cards on the
 * ten rows on screen, and a rename sent the whole form, which the API read as
 * a security change and logged the person out (USR-EDIT-1).
 */

const COMPANY = "018fed00-0000-7000-8000-00000000000a";
const OTHER = "018fed00-0000-7000-8000-00000000000b";
const PROFILE = "018fed00-0000-7000-8000-0000000000c1";
const DRIVER = "018fed00-0000-7000-8000-0000000000d1";

describe("the scope decides the company", () => {
  it("on /admin, the selector's company from the URL, never the session's", () => {
    expect(scopedBusinessId("admin", COMPANY, OTHER)).toBe(COMPANY);
    expect(scopedBusinessId("admin", null, OTHER)).toBeUndefined();
    // Not a company id: treated as no selection, never sent to the API.
    expect(scopedBusinessId("admin", "../../user/me", OTHER)).toBeUndefined();
  });

  it("on /dashboard, the session's company, whatever the URL says", () => {
    expect(scopedBusinessId("dashboard", OTHER, COMPANY)).toBe(COMPANY);
    expect(scopedBusinessId("dashboard", OTHER, null)).toBeUndefined();
  });

  it("shares read as count and percentage, and unknown as a dash", () => {
    expect(countWithShare(7, 10)).toBe("7 (70%)");
    expect(countWithShare(0, 0)).toBe("0");
    expect(countWithShare(undefined, 10)).toBe("—");
  });
});

describe("the user edit form (USR-EDIT-1, decisions 2.5 and 4.6)", () => {
  const stored = userFormValuesOf({
    email: "ana@exemplo.com.br",
    name: "Ana Souza",
    role: "BUSINESS_USER",
    businessId: COMPANY,
    profileAccessId: PROFILE,
    driverId: null,
  });

  const edit = (changes: Partial<UserFormValues>): UserFormValues => ({
    ...stored,
    ...changes,
  });

  it("the whole form sent back unchanged is no change: Save stays disabled", () => {
    expect(changedUserFields(stored, edit({}))).toEqual([]);
    // Spaces around a value are not a change either.
    expect(changedUserFields(stored, edit({ name: " Ana Souza " }))).toEqual(
      [],
    );
  });

  it("a rename is a change that keeps the person logged in", () => {
    const renamed = edit({ name: "Ana Souza Lima" });

    expect(changedUserFields(stored, renamed)).toEqual(["name"]);
    expect(editEndsSessions(stored, renamed)).toBe(false);
  });

  it("a new e-mail or another profile keeps the sessions too", () => {
    expect(
      editEndsSessions(stored, edit({ email: "ana.souza@exemplo.com.br" })),
    ).toBe(false);
    expect(editEndsSessions(stored, edit({ profileAccessId: OTHER }))).toBe(
      false,
    );
  });

  it("a new role, company or driver link ends the sessions, as the API does", () => {
    expect(
      editEndsSessions(
        stored,
        edit({ role: "BUSINESS_ADMIN", profileAccessId: "" }),
      ),
    ).toBe(true);
    expect(editEndsSessions(stored, edit({ businessId: OTHER }))).toBe(true);
    expect(
      editEndsSessions(stored, edit({ profileAccessId: "", driverId: DRIVER })),
    ).toBe(true);
  });

  it("an administrator carries neither a profile nor a driver", () => {
    expect(changedUserFields(stored, edit({ role: "BUSINESS_ADMIN" }))).toEqual(
      ["role", "profileAccessId"],
    );
  });

  it("a company user needs the link of the chosen type", () => {
    expect(userLinkIssue(edit({ profileAccessId: "" }), "employee")).toEqual({
      field: "profileAccessId",
      message: "Selecione um perfil de acesso.",
    });
    expect(userLinkIssue(edit({ profileAccessId: "" }), "driver")).toEqual({
      field: "driverId",
      message: "Selecione um motorista.",
    });
    expect(
      userLinkIssue(edit({ role: "BUSINESS_ADMIN" }), "employee"),
    ).toBeNull();
  });

  it("offers only roles up to the actor's own, and revoking only to administrators", () => {
    expect(
      roleOptionsFor("BUSINESS_USER").map((option) => option.value),
    ).toEqual(["BUSINESS_USER"]);
    expect(roleOptionsFor("MASTER").map((option) => option.value)).toEqual([
      "BUSINESS_ADMIN",
      "BUSINESS_USER",
    ]);
    expect(revokeBlockedReason("BUSINESS_ADMIN")).toBeNull();
    expect(revokeBlockedReason("BUSINESS_USER")).toMatch(/Só administradores/);
  });
});

describe("the master form (decision 4.9: no password field)", () => {
  it("enables Save only for a real change", () => {
    const stored = masterFormValuesOf({
      email: "m@exemplo.com.br",
      name: "Master Um",
    });

    expect(stored).toEqual({ email: "m@exemplo.com.br", name: "Master Um" });
    expect(
      changedMasterFields(stored, { ...stored, name: "Master Um " }),
    ).toEqual([]);
    expect(
      changedMasterFields(stored, { ...stored, email: "m2@exemplo.com.br" }),
    ).toEqual(["email"]);
  });
});

describe("the user cards read the server's numbers only (decision 8.8)", () => {
  it("maps searchMeta, with the verified share over the filtered list", () => {
    expect(
      userStatsData(
        {
          total: 40,
          active: 35,
          twoFactor: 8,
          twoFactorTotal: 40,
          emailVerified: 12,
        },
        20,
      ),
    ).toEqual({
      totalUsers: 40,
      activeUsers: 35,
      twoFactor: 8,
      twoFactorTotal: 40,
      emailVerified: 12,
      listTotal: 20,
    });
  });

  it("says a dash, not a confident zero, before the API answers", () => {
    const data = userStatsData(undefined, 10);
    const card = (key: string) => userStats.find((stat) => stat.key === key)!;

    expect(card("total-users").calculateValue!(data)).toBe("—");
    expect(card("active-users").calculateValue!(data)).toBe("—");
  });

  it("names the master cards for masters, with the same numbers", () => {
    expect(masterUserStats.map((stat) => stat.title)).toEqual([
      "Total de Masters",
      "Masters Ativos",
      "E-mail Verificado",
      "Autenticação 2FA",
    ]);
    expect(masterUserStats.map((stat) => stat.valueKey)).toEqual(
      userStats.map((stat) => stat.valueKey),
    );
  });
});

describe("the lists ask the server (decision 8.8)", () => {
  it("users: forwards sort and facets, drops what the API does not take", () => {
    expect(
      userListQuery({
        sort: "name",
        order: "desc",
        role: "BUSINESS_ADMIN,MASTER",
        access: "revoked",
        profileAccessId: `${PROFILE},not-a-uuid`,
        page: "3",
      }),
    ).toEqual({
      sort: "name",
      order: "desc",
      role: "BUSINESS_ADMIN",
      access: "revoked",
      profileAccessId: PROFILE,
    });

    expect(userListQuery({ sort: "whatsapp_phone" })).toEqual({});
    expect(USER_TABLE.sortable).toContain("profileAccess");
  });

  it("masters: no role nor profile to sort or filter by", () => {
    expect(MASTER_USER_TABLE.sortable).not.toContain("role");
    expect(Object.keys(MASTER_USER_TABLE.facets ?? {})).toEqual([
      "access_revoked",
      "two_factor_enabled",
    ]);
    expect(
      masterUserListQuery({ role: "BUSINESS_ADMIN", two_factor: "enabled" }),
    ).toEqual({
      two_factor: "enabled",
    });
  });

  it("profiles: sorts by what the database counts", () => {
    expect(PROFILE_ACCESS_TABLE.sortable).toEqual([
      "created_at",
      "updated_at",
      "name",
      "usersCount",
      "permissionsCount",
    ]);
    expect(
      profileAccessListQuery({ sort: "usersCount", order: "desc" }),
    ).toEqual({
      sort: "usersCount",
      order: "desc",
    });
    expect(profileAccessListQuery({ sort: "business_name" })).toEqual({});
  });

  it("permissions: resource, profile, read and write facets", () => {
    expect(
      permissionListQuery({
        permissionKey: "vehicle_manage,root",
        write: "enabled",
        read: "enabled",
        profileAccessId: PROFILE,
        sort: "canWrite",
      }),
    ).toEqual({
      permissionKey: "vehicle_manage",
      write: "enabled",
      read: "enabled",
      profileAccessId: PROFILE,
      sort: "canWrite",
      // A sort without an order is ascending, as the API reads it.
      order: "asc",
    });
    expect(PERMISSION_TABLE.sortable).toContain("profile_name");
  });
});

describe("the access-profile rules", () => {
  it("blocks deleting a profile in use, with the count", () => {
    expect(deleteProfileBlockedReason(0, null)).toBeNull();
    expect(deleteProfileBlockedReason(1, null)).toBe(
      "Em uso por 1 usuário. Troque o perfil dele antes de excluir.",
    );
    expect(deleteProfileBlockedReason(3, null)).toBe(
      "Em uso por 3 usuários. Troque o perfil deles antes de excluir.",
    );
    // A missing permission is the reason, whatever the count.
    expect(deleteProfileBlockedReason(3, "Sem permissão")).toBe(
      "Sem permissão",
    );
  });

  it("a rename that only adds spaces is no change", () => {
    expect(profileNameChanged("Operação", " Operação ")).toBe(false);
    expect(profileNameChanged("Operação", "Operação Norte")).toBe(true);
  });

  it("counts read naturally", () => {
    expect(countLabel(1, "usuário", "usuários")).toBe("1 usuário");
    expect(countLabel(0, "permissão", "permissões")).toBe("0 permissões");
  });
});

describe("the permission form and cards", () => {
  const stored = permissionFormValuesOf({
    action: "Consultar veículos",
    permissionKey: "vehicle_manage",
    profileAccessId: PROFILE,
    canRead: true,
    canWrite: true,
  });

  it("a new permission starts with read, which every permission needs", () => {
    expect(permissionFormValuesOf(undefined)).toMatchObject({
      canRead: true,
      canWrite: false,
    });
  });

  it("unticking read unticks write, and that is a change", () => {
    expect(withReadRule({ ...stored, canRead: false })).toMatchObject({
      canRead: false,
      canWrite: false,
    });
    expect(
      changedPermissionFields(stored, { ...stored, canRead: false }),
    ).toEqual(["canRead", "canWrite"]);
    expect(
      changedPermissionFields(stored, {
        ...stored,
        action: " Consultar veículos ",
      }),
    ).toEqual([]);
  });

  it("refuses what the API refuses before sending", () => {
    expect(permissionFormIssue({ ...stored, canRead: false })).toEqual({
      field: "canRead",
      message:
        "Selecione a opção Leitura (caso deseje, marque também Escrita).",
    });
    expect(permissionFormIssue({ ...stored, profileAccessId: "" })?.field).toBe(
      "profileAccessId",
    );
    expect(permissionFormIssue(stored)).toBeNull();
  });

  it("labels every resource, and a key this build does not know as itself", () => {
    expect(resourceOptions().length).toBeGreaterThan(10);
    expect(resourceLabel("unknown_key")).toBe("unknown_key");
  });

  it("maps the cards from searchMeta only", () => {
    expect(
      permissionStatsData({ total: 12, writable: 5, readOnly: 7 }),
    ).toEqual({
      totalPermissions: 12,
      writable: 5,
      readOnly: 7,
    });

    const empty = permissionStatsData(undefined);
    expect(permissionStats[0].calculateValue!(empty)).toBe("—");
    expect(
      permissionStats[1].calculateValue!({ totalPermissions: 12, writable: 5 }),
    ).toBe("5 (42%)");
  });
});

describe("one implementation per screen (decision 8.7)", () => {
  const APP = join(__dirname, "../../src/app/(protected)");

  const read = (path: string) => readFileSync(join(APP, path), "utf8");

  it.each([
    ["user-registration", "@/features/user/content", "UserContent"],
    [
      "profile-access",
      "@/features/profile-access/content",
      "ProfileAccessContent",
    ],
    ["permission", "@/features/permission/content", "PermissionContent"],
  ])(
    "/admin and /dashboard %s render the same content, by scope",
    (page, module, content) => {
      for (const scope of ["admin", "dashboard"] as const) {
        const source = read(`${scope}/${page}/page.tsx`);

        expect(source).toContain(`from "${module}"`);
        // Prettier puts the props on their own lines once they overflow.
        expect(source).toMatch(new RegExp(`<${content}\\s+scope="${scope}"`));
      }
    },
  );

  it("the old copies are gone", () => {
    for (const path of [
      "_components/admin/user",
      "_components/admin/profile-access",
      "_components/admin/permission",
      "_components/admin/master-user",
      "_components/dashboard/dashboard-user",
      "_components/dashboard/dashboard-profile-access",
      "_components/dashboard/dashboard-permission",
    ]) {
      expect(existsSync(join(APP, path)), path).toBe(false);
    }
  });

  it("the master screen is built from the user feature", () => {
    expect(read("admin/master-users/page.tsx")).toContain(
      "@/features/user/master-content",
    );
  });
});
