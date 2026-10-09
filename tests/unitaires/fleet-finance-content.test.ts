import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ReactElement } from "react";

// Puts React in scope for the classic JSX runtime vitest compiles with.
import "./helpers/render-html";

import { AccountPayableContent } from "@/features/account-payable/content";
import { SupplierContent } from "@/features/supplier/content";

import { AccessErrorState } from "@/components/shared/custom/access-error-state";
import { ManageModulesButton } from "@/components/shared/custom/access-error-state/manage-modules-button";

/**
 * The unified Fornecedores and Contas a pagar screens, rendered as the server
 * renders them (the async component called with its props; only the API is
 * replaced, by a canned answer):
 *
 * - switching company on /admin restarts the screen (decision 2.6): the
 *   content is keyed by the company, as the other unified features are;
 * - the MASTER on a company without the module is offered "Gerenciar
 *   módulos" (decision 4.3), and nobody else is.
 */
const A = "018f0000-0000-7000-8000-00000000000a";

type Content = typeof AccountPayableContent;

const screens: Array<[string, Content]> = [
  ["Contas a pagar", AccountPayableContent],
  ["Fornecedores", SupplierContent as unknown as Content],
];

function ndjson(lines: unknown[]): Response {
  return new Response(
    lines.map((line) => JSON.stringify(line)).join("\n") + "\n",
    {
      status: 200,
      headers: { "content-type": "application/x-ndjson" },
    },
  );
}

function refusal(code: string): Response {
  return new Response(JSON.stringify({ code, message: "Recusado." }), {
    status: 403,
    headers: { "content-type": "application/json" },
  });
}

/** The children of the screen's root element, flattened. */
function childrenOf(element: ReactElement): ReactElement[] {
  const { children } = element.props as { children?: unknown };

  return ([] as unknown[])
    .concat(children)
    .filter(
      (child): child is ReactElement =>
        Boolean(child) && typeof child === "object",
    );
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  process.env.HTTP_REQUEST = "http://api.test";
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe.each(screens)("the %s screen", (_name, Screen) => {
  it("keys the loaded screen by the /admin company, so a switch restarts it", async () => {
    // A fresh body per call: a Response is read once.
    fetchMock.mockImplementation(async () =>
      ndjson([{ meta: { total: 0, page: 1, pageSize: 10 } }]),
    );

    const admin = (await Screen({
      mode: "admin",
      searchParams: { businessId: A },
      token: "token",
    })) as ReactElement;

    const dashboard = (await Screen({
      mode: "dashboard",
      searchParams: {},
      token: "token",
    })) as ReactElement;

    expect(admin.key).toBe(A);
    expect(dashboard.key).toBe("session");
    // The MASTER names the company to the API; the session user does not.
    expect(String(fetchMock.mock.calls[0][0])).toContain(`businessId=${A}`);
    expect(String(fetchMock.mock.calls[1][0])).not.toContain("businessId=");
  });

  it("offers the MASTER 'Gerenciar módulos' for a company without the module", async () => {
    fetchMock.mockImplementation(async () => refusal("MODULE_NOT_ENABLED"));

    const screen = (await Screen({
      mode: "admin",
      searchParams: { businessId: A },
      token: "token",
    })) as ReactElement;

    const state = childrenOf(screen).find(
      (child) => child.type === AccessErrorState,
    );
    const action = (state?.props as { action?: ReactElement }).action;

    expect(state?.props).toMatchObject({
      kind: "module-not-enabled",
      audience: "master",
    });
    expect(action?.type).toBe(ManageModulesButton);
    expect(action?.props).toEqual({ businessId: A });
  });

  it("offers no way out for other refusals, nor to the company's own users", async () => {
    fetchMock.mockResolvedValueOnce(refusal("TENANT_INACTIVE"));

    const inactive = (await Screen({
      mode: "admin",
      searchParams: { businessId: A },
      token: "token",
    })) as ReactElement;

    fetchMock.mockResolvedValueOnce(refusal("MODULE_NOT_ENABLED"));

    const company = (await Screen({
      mode: "dashboard",
      searchParams: {},
      token: "token",
    })) as ReactElement;

    const stateOf = (screen: ReactElement) =>
      childrenOf(screen).find((child) => child.type === AccessErrorState)
        ?.props as { kind: string; action?: unknown } | undefined;

    expect(stateOf(inactive)).toMatchObject({ kind: "tenant-inactive" });
    expect(stateOf(inactive)?.action).toBeUndefined();
    expect(stateOf(company)).toMatchObject({ kind: "module-not-enabled" });
    expect(stateOf(company)?.action).toBeUndefined();
  });
});
