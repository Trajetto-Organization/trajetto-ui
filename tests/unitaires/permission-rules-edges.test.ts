import { describe, expect, it } from "vitest";

import {
  changedPermissionFields,
  permissionFormIssue,
  permissionFormValuesOf,
  resourceOptions,
} from "@/features/permission/lib/permission-rules";

/**
 * Edges of the permission form's rules left alive by the 06/10 mutation run:
 * the resource list, the empty form, spaces around the action, and the
 * missing-permission message.
 */

const filled = {
  action: "Abastecer",
  permissionKey: "fuel_manage",
  profileAccessId: "profile-1",
  canRead: true,
  canWrite: false,
};

describe("resourceOptions", () => {
  it("lists every permission with its label, in the canonical order", () => {
    const options = resourceOptions();

    expect(options[0]).toEqual({
      value: "branch_manage",
      label: "Gerenciar Filiais",
    });
    expect(options.find((option) => option.value === "fuel_manage")).toEqual({
      value: "fuel_manage",
      label: "Gerenciar Abastecimentos",
    });
    expect(
      options.every((option) => option.label.startsWith("Gerenciar")),
    ).toBe(true);
  });
});

describe("permissionFormValuesOf", () => {
  it("starts a new permission empty, with read ticked", () => {
    expect(permissionFormValuesOf(undefined)).toEqual({
      action: "",
      permissionKey: "",
      profileAccessId: "",
      canRead: true,
      canWrite: false,
    });
  });

  it("copies an existing one", () => {
    expect(permissionFormValuesOf(filled)).toEqual(filled);
  });
});

describe("changedPermissionFields", () => {
  it("reads spaces around the action, on either side, as no change", () => {
    expect(
      changedPermissionFields({ ...filled, action: " Abastecer " }, filled),
    ).toEqual([]);
    expect(
      changedPermissionFields(filled, { ...filled, action: "Abastecer  " }),
    ).toEqual([]);
    expect(
      changedPermissionFields(filled, {
        ...filled,
        action: "Abastecer veículo",
      }),
    ).toEqual(["action"]);
  });
});

describe("permissionFormIssue", () => {
  it("asks for the profile first, then the permission", () => {
    expect(
      permissionFormIssue({
        ...filled,
        profileAccessId: "",
        permissionKey: "",
      }),
    ).toEqual({
      field: "profileAccessId",
      message: "Selecione o perfil de acesso.",
    });
    expect(permissionFormIssue({ ...filled, permissionKey: "" })).toEqual({
      field: "permissionKey",
      message: "Selecione a permissão.",
    });
    expect(permissionFormIssue(filled)).toBeNull();
  });
});
