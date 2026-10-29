import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The maintenance screens' answer to a 403, rendered from the real server
 * content with the API's refusal (decisions 4.1 and 4.3).
 *
 * The MASTER on /admin, for a company without Gestão de Frota, got "Módulo
 * não contratado" with no way out, while Multas, Abastecimento, Rotas and
 * Integrações already opened Módulos Contratados from the same state. The
 * company user has nothing to enable, and a permission refusal is not about
 * the plan, so neither gets the button.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`redirect ${to}`);
  },
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
  usePathname: () => "/admin/service-order",
}));

// The toolbar and the list body are client screens of their own; what is
// proven here is the refusal branch, which returns before any of them.
vi.mock("@/app/(protected)/_components/layout/protected-page-toolbar", () => ({
  ProtectedPageToolbar: () => null,
  PageActions: () => null,
}));
vi.mock("@/app/(protected)/_components/shared/business-selector", () => ({
  BusinessSelector: () => null,
}));
vi.mock("@/features/service-order/page-actions", () => ({
  ServiceOrderPageActions: () => null,
}));
vi.mock("@/features/service-order/stats", () => ({
  ServiceOrderStats: () => null,
}));
vi.mock("@/features/service-order/table", () => ({
  ServiceOrderTable: () => null,
}));
vi.mock("@/features/part/page-actions", () => ({
  PartPageActions: () => null,
}));
vi.mock("@/features/part/stats", () => ({ PartStats: () => null }));
vi.mock("@/features/part/table", () => ({ PartTable: () => null }));
vi.mock("@/features/service-order/order-parts/page-actions", () => ({
  OrderPartPageActions: () => null,
}));
vi.mock("@/features/service-order/order-parts/stats", () => ({
  OrderPartStats: () => null,
}));
vi.mock("@/features/service-order/order-parts/table", () => ({
  OrderPartTable: () => null,
}));

// The dialog behind the button needs the whole session; its presence and
// the company it opens for are what matter here.
vi.mock(
  "@/components/shared/custom/access-error-state/manage-modules-button",
  () => ({
    ManageModulesButton: ({ businessId }: { businessId: string }) =>
      createElement(
        "button",
        { "data-manage-modules": businessId },
        "Gerenciar módulos",
      ),
  }),
);

import { ServiceOrderContent } from "@/features/service-order/content";
import { PartContent } from "@/features/part/content";
import { ServiceOrderPartContent } from "@/features/service-order/order-parts/content";

(globalThis as { React?: typeof React }).React = React;

const COMPANY = "018f0000-0000-7000-8000-0000000000aa";

type Content = (props: {
  mode: "admin" | "dashboard";
  searchParams: Record<string, string | string[] | undefined>;
  token: string;
}) => Promise<JSX.Element>;

const SCREENS: Array<[string, Content]> = [
  ["the service orders screen", ServiceOrderContent as Content],
  ["the parts screen", PartContent as Content],
  ["the service order parts screen", ServiceOrderPartContent as Content],
];

let root: Root | null = null;

function refuseWith(code: string, message: string): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(JSON.stringify({ code, message }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }),
    ),
  );
}

async function render(
  content: Content,
  mode: "admin" | "dashboard",
  searchParams: Record<string, string> = {},
): Promise<HTMLElement> {
  const element = await content({ mode, searchParams, token: "token" });

  const host = document.createElement("div");
  root = createRoot(host);

  await act(async () => {
    root!.render(element);
  });

  return host;
}

beforeEach(() => {
  process.env.HTTP_REQUEST = "http://api.test";
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  vi.unstubAllGlobals();
});

describe.each(SCREENS)("%s refused with 403", (_name, content) => {
  it("offers the MASTER the company's modules when Frota is not enabled", async () => {
    refuseWith("MODULE_NOT_ENABLED", "Módulo não habilitado.");

    const host = await render(content, "admin", { businessId: COMPANY });

    expect(host.textContent).toContain("Módulo Gestão de Frota não contratado");

    const button = host.querySelector("[data-manage-modules]");

    expect(button?.getAttribute("data-manage-modules")).toBe(COMPANY);
  });

  it("gives the company user the state without a button", async () => {
    refuseWith("MODULE_NOT_ENABLED", "Módulo não habilitado.");

    const host = await render(content, "dashboard");

    expect(host.textContent).toContain("Módulo Gestão de Frota não contratado");
    expect(host.querySelector("[data-manage-modules]")).toBeNull();
  });

  it("never offers modules for a permission refusal", async () => {
    refuseWith("PERMISSION_DENIED", "Seu perfil não pode ver esta seção.");

    const host = await render(content, "admin", { businessId: COMPANY });

    expect(host.textContent).not.toContain("não contratado");
    expect(host.querySelector("[data-manage-modules]")).toBeNull();
  });
});
