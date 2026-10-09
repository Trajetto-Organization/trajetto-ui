import * as React from "react";
import { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The service order row menu and the permissions of the screens it opens
 * (decisions 3.5 and 4.2): an item the profile cannot use is shown disabled
 * with the reason, never a link to a refusal. "Ver Peças da Ordem" opened the
 * part-line screen for any profile, and a profile without the part-line key
 * landed on "sem permissão".
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

const navigation = vi.hoisted(() => ({ pushed: [] as string[] }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: (to: string) => navigation.pushed.push(to),
    refresh: () => {},
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/dashboard/service-order",
}));

// The Radix menu needs pointer events happy-dom does not have; the items and
// the reason each one carries are what is proven, so they render flat.
vi.mock("@/components/shared/custom/row-actions", () => ({
  RowActions: ({ children }: { children: ReactNode }) =>
    createElement("div", null, children),
  RowActionSeparator: () => null,
  RowActionItem: ({
    label,
    blockedReason,
    onSelect,
  }: {
    label: string;
    blockedReason?: string | null;
    onSelect: () => void;
  }) =>
    createElement(
      "button",
      {
        "data-label": label,
        "data-blocked": blockedReason ?? "",
        disabled: Boolean(blockedReason),
        onClick: onSelect,
      },
      label,
    ),
}));

// Dialogs backed by server actions; they only open on select.
vi.mock("@/features/service-order/update-form", () => ({
  UpdateServiceOrderDialog: () => null,
}));
vi.mock("@/features/service-order/delete-dialog", () => ({
  DeleteServiceOrderDialog: () => null,
}));

import { useAuthStore } from "@/store/auth-store";
import { ServiceOrderRowActions } from "@/features/service-order/row-actions";
import type { ServiceOrderRow } from "@/features/service-order/server-table";

(globalThis as { React?: typeof React }).React = React;

const ORDER = {
  id: "018f0000-0000-7000-8000-000000000001",
  businessId: "018f0000-0000-7000-8000-00000000000b",
  vehicleId: "v1",
  responsibleUserId: "u1",
  branchId: "b1",
  supplierId: null,
  completion_date: null,
  accounts_payable_count: 0,
  vehicle: { license_plate: "ABC1D23" },
} as unknown as ServiceOrderRow;

let root: Root | null = null;
let host: HTMLElement;

function asProfile(
  grants: Array<{ key: string; read: boolean; write: boolean }>,
): void {
  useAuthStore.setState({
    role: "BUSINESS_USER",
    isLoaded: true,
    businessId: ORDER.businessId,
    permissions: grants.map(({ key, read, write }) => ({
      permissionKey: key,
      canRead: read,
      canWrite: write,
    })),
  } as never);
}

async function render(scope: "admin" | "dashboard"): Promise<void> {
  host = document.createElement("div");
  root = createRoot(host);

  await act(async () => {
    root!.render(
      createElement(ServiceOrderRowActions, { scope, serviceOrder: ORDER }),
    );
  });
}

const item = (label: string) =>
  host.querySelector(`[data-label="${label}"]`) as HTMLButtonElement;

beforeEach(() => {
  navigation.pushed.length = 0;
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
});

describe("the Ver Peças da Ordem action", () => {
  it("is disabled with the reason for a profile without the part-line key", async () => {
    asProfile([{ key: "service_order_manage", read: true, write: true }]);

    await render("dashboard");

    expect(item("Ver Peças da Ordem").disabled).toBe(true);
    expect(item("Ver Peças da Ordem").dataset.blocked).toContain(
      "Gerenciar Ordens de Serviço Por Peça",
    );
  });

  it("opens the part lines of this order for a profile that reads them", async () => {
    asProfile([
      { key: "service_order_manage", read: true, write: false },
      { key: "service_order_part_manage", read: true, write: false },
    ]);

    await render("dashboard");

    expect(item("Ver Peças da Ordem").disabled).toBe(false);

    await act(async () => item("Ver Peças da Ordem").click());

    expect(navigation.pushed).toEqual([
      `/dashboard/service-order-part?serviceOrderId=${ORDER.id}`,
    ]);
  });

  it("carries the selected company on /admin", async () => {
    useAuthStore.setState({
      role: "MASTER",
      isLoaded: true,
      permissions: [],
    } as never);

    await render("admin");

    await act(async () => item("Ver Peças da Ordem").click());

    expect(navigation.pushed).toEqual([
      `/admin/service-order-part?businessId=${ORDER.businessId}&serviceOrderId=${ORDER.id}`,
    ]);
  });
});

describe("the write actions of a read-only profile", () => {
  it("are disabled with the reason, and the copies stay usable", async () => {
    asProfile([
      { key: "service_order_manage", read: true, write: false },
      { key: "service_order_part_manage", read: true, write: false },
    ]);

    await render("dashboard");

    expect(item("Editar Ordem de Serviço").disabled).toBe(true);
    expect(item("Excluir Ordem de Serviço").disabled).toBe(true);
    expect(item("Excluir Ordem de Serviço").dataset.blocked).toContain(
      "Gerenciar Ordens de Serviço",
    );
    expect(item("Copiar ID").disabled).toBe(false);
    // The company id is a master's tool across companies, not the dashboard's.
    expect(item("Copiar ID da empresa")).toBeNull();
  });
});
