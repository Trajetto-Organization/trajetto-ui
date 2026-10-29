import * as React from "react";
import { act, createElement, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The user and permission dialogs, as the owner asked on 08/10/2026
 * (decisions 16.62 and 16.63):
 *
 * - the user dialog has no "Mover para outra empresa (opcional)" any more —
 *   the user belongs to the company chosen at the top of the page;
 * - it reads in one column, in the order a person is described: e-mail and
 *   name, Tipo de usuário (and which driver), Nível de acesso and Perfil, and
 *   on edit the password link last; at the access profile dialog's width,
 *   with Cancelar and Criar/Salvar sharing the footer row;
 * - the permission dialog asks the profile last, after Tipo de acesso.
 *
 * The server actions and the record pickers are stood in for: what is proven
 * here is the dialog's own markup, not the API or the pickers' lists.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

// The canary hooks Next ships; the test's React does not have them.
vi.mock("react-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-dom")>()),
  useFormState: (_action: unknown, initial: unknown) => [initial, () => {}],
  useFormStatus: () => ({ pending: false }),
}));

vi.mock("@/actions/user/create-user", () => ({
  handleCreateUser: vi.fn(async () => ({})),
}));
vi.mock("@/actions/user/update-user-registration", () => ({
  handleUpdateUserRegistration: vi.fn(async () => ({})),
}));
vi.mock("@/actions/permission/create-permission", () => ({
  handleCreatePermission: vi.fn(async () => ({})),
}));
vi.mock("@/actions/permission/update-permission", () => ({
  handleUpdatePermission: vi.fn(async () => ({})),
}));
vi.mock("@/features/user/lib/after-write", () => ({
  refreshAfterUserWrite: vi.fn(),
}));
vi.mock("@/features/permission/lib/after-write", () => ({
  refreshAfterPermissionWrite: vi.fn(),
}));

vi.mock("@/app/(protected)/_components/shared/searches/search-driver", () => ({
  SearchDriver: () =>
    createElement("div", { "data-picker": "driver" }, "Selecione o motorista"),
}));
vi.mock(
  "@/app/(protected)/_components/shared/searches/search-profile-access",
  () => ({
    SearchProfileAccess: () =>
      createElement(
        "div",
        { "data-picker": "profile" },
        "Selecione o perfil de acesso",
      ),
  }),
);
vi.mock(
  "@/app/(protected)/_components/shared/searches/search-business",
  () => ({
    SearchBusiness: () =>
      createElement(
        "div",
        { "data-picker": "business" },
        "Selecione a empresa",
      ),
  }),
);

import { UserFormDialog } from "@/features/user/form-dialog";
import { PermissionFormDialog } from "@/features/permission/form-dialog";
import { effectiveRole } from "@/features/user/lib/user-rules";
import { useAuthStore } from "@/store/auth-store";

import type { UserRow } from "@/features/user/types";
import type { PermissionRow } from "@/features/permission/types";

(globalThis as { React?: typeof React }).React = React;

const BUSINESS = "018f0000-0000-7000-8000-00000000000b";

let root: Root | null = null;

async function mount(element: ReactElement): Promise<HTMLElement> {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  await act(async () => {
    root!.render(element);
  });

  return document.body;
}

beforeEach(() => {
  useAuthStore.setState({ role: "MASTER" });
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

const employee = {
  id: "018f0000-0000-7000-8000-0000000000a1",
  email: "consulta@trajetto.test",
  name: "Consulta E2E",
  role: "BUSINESS_USER",
  businessId: BUSINESS,
  profileAccessId: "018f0000-0000-7000-8000-0000000000p1",
  profileAccess: { name: "Consulta de entregas" },
  driverId: null,
} as unknown as UserRow;

const driverUser = {
  ...employee,
  id: "018f0000-0000-7000-8000-0000000000a2",
  name: "Motorista Atendimento",
  profileAccessId: null,
  profileAccess: null,
  driverId: "018f0000-0000-7000-8000-0000000000d1",
  driver: { name: "Motorista Atendimento" },
} as unknown as UserRow;

function fieldOrder(body: HTMLElement): string[] {
  return Array.from(
    body.querySelectorAll<HTMLElement>("[data-user-field]"),
  ).map((element) => element.dataset.userField!);
}

function userDialog(user?: UserRow): ReactElement {
  // `scope: "admin"` is what drew the move section before; the dialog no
  // longer reads it, and passing it keeps the test honest against the old one.
  const props = {
    scope: "admin",
    businessId: BUSINESS,
    user,
    isOpen: true,
    onClose: () => {},
  };

  return createElement(
    UserFormDialog,
    props as React.ComponentProps<typeof UserFormDialog>,
  );
}

describe("the user dialog", () => {
  it("has no 'move to another company' section, on edit by a MASTER", async () => {
    // Red before decision 16.62: the MASTER's edit drew the section and a
    // company picker.
    const body = await mount(userDialog(employee));

    expect(body.textContent).not.toMatch(/Mover para outra empresa/);
    expect(body.querySelector('[data-picker="business"]')).toBeNull();
  });

  it("reads identity, type, level, profile and the password link, in that order", async () => {
    const body = await mount(userDialog(employee));

    const email = body.querySelector("#user-email")!;
    const typeBlock = body.querySelector('[data-user-field="type"]')!;

    // E-mail and name come before everything else.
    expect(
      email.compareDocumentPosition(typeBlock) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(fieldOrder(body)).toEqual([
      "type",
      "role",
      "profile",
      "password-link",
    ]);
  });

  it("puts the driver link with the type and asks no level of a Motorista", async () => {
    const body = await mount(userDialog(driverUser));

    expect(fieldOrder(body)).toEqual(["type", "password-link"]);
    expect(body.querySelector('[data-user-field="type"]')!.textContent).toMatch(
      /Motorista\s*\*\s*Motorista Atendimento/,
    );
    expect(body.querySelector("#user-role")).toBeNull();
  });

  it("offers the password link on edit only", async () => {
    const body = await mount(userDialog());

    expect(fieldOrder(body)).not.toContain("password-link");
    expect(fieldOrder(body)[0]).toBe("type");
  });

  it("is one column at the access profile dialog's width, with a filled footer", async () => {
    const body = await mount(userDialog(employee));

    const form = body.querySelector<HTMLFormElement>("[data-user-form]")!;
    const content = form.closest('[role="dialog"]')!;

    // Red before: max-w-2xl and a two-column grid (md:grid-cols-2).
    expect(content.className.split(/\s+/)).toContain("max-w-xl");
    expect(content.className).not.toMatch(/max-w-2xl/);
    expect(form.querySelector('[class*="grid-cols-2"]')).toBeNull();

    const footer = form.querySelector<HTMLElement>("[data-dialog-footer]")!;

    expect(footer.dataset.dialogFooter).toBe("fill");
    expect(footer.textContent).toMatch(/Cancelar.*Salvar Alterações/);
  });
});

/** The label text and the chip's classes of each chosen record shown in place of its search. */
function pickedRows(
  body: HTMLElement,
): { label: string; chip: string[]; clear: string[] }[] {
  return Array.from(
    body.querySelectorAll<HTMLElement>("[data-picked-field]"),
  ).map((row) => {
    const shell = row.parentElement!.parentElement!;

    return {
      label: shell
        .querySelector("label")!
        .textContent!.replace(/\s+/g, " ")
        .trim(),
      chip: row.querySelector("[id]")!.className.split(/\s+/),
      clear: row.querySelector("button")!.className.split(/\s+/),
    };
  });
}

describe("a record already chosen in the dialogs", () => {
  // Red before: a bare h-8 dashed chip ("Perfil: …" / "Motorista: …") with no
  // label, the one thin unlabelled row of the one-column form.
  it.each([
    [
      "the user dialog's profile",
      () => userDialog(employee),
      "Perfil de acesso *",
    ],
    ["the user dialog's driver", () => userDialog(driverUser), "Motorista *"],
    [
      "the permission dialog's profile",
      () =>
        createElement(PermissionFormDialog, {
          businessId: BUSINESS,
          permission,
          isOpen: true,
          onClose: () => {},
        }),
      "Perfil de acesso *",
    ],
  ] as const)(
    "keeps %s labelled and at the input height",
    async (_name, dialog, label) => {
      const body = await mount(dialog());
      const rows = pickedRows(body);

      expect(rows).toHaveLength(1);
      expect(rows[0].label).toBe(label);
      expect(rows[0].chip).toContain("h-10");
      expect(rows[0].chip).not.toContain("h-8");
      expect(rows[0].clear).toEqual(expect.arrayContaining(["h-10", "w-10"]));
    },
  );
});

describe("effectiveRole", () => {
  it("sends a Motorista as a plain user whatever level was picked before", () => {
    expect(effectiveRole("", "driver")).toBe("BUSINESS_USER");
    expect(effectiveRole("BUSINESS_ADMIN", "driver")).toBe("BUSINESS_USER");
  });

  it("keeps a Colaborador's chosen level", () => {
    expect(effectiveRole("BUSINESS_ADMIN", "employee")).toBe("BUSINESS_ADMIN");
    expect(effectiveRole("", "employee")).toBe("");
  });
});

const permission = {
  id: "018f0000-0000-7000-8000-0000000000e1",
  action: "Consultar veículos",
  permissionKey: "vehicle_manage",
  profileAccessId: "018f0000-0000-7000-8000-0000000000p1",
  profileAccess: { name: "Consulta de entregas" },
  canRead: true,
  canWrite: false,
} as unknown as PermissionRow;

describe("the permission dialog", () => {
  it.each([
    ["create", undefined, '[data-picker="profile"]'],
    ["edit", permission, '[aria-label="Remover perfil"]'],
  ] as const)(
    "asks the profile last, after Tipo de acesso, on %s",
    async (_mode, row, profileSelector) => {
      // Red before: the profile came right after Recurso, above Tipo de acesso.
      const body = await mount(
        createElement(PermissionFormDialog, {
          businessId: BUSINESS,
          permission: row,
          isOpen: true,
          onClose: () => {},
        }),
      );

      const access = body.querySelector("#permission-read")!;
      const profile = body.querySelector(profileSelector)!;
      const submit = body.querySelector('button[type="submit"]')!;

      expect(profile).not.toBeNull();
      expect(
        access.compareDocumentPosition(profile) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        profile.compareDocumentPosition(submit) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    },
  );
});
