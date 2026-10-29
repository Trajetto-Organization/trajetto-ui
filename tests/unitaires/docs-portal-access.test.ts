// @vitest-environment node
import * as React from "react";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { NextRequest } from "next/server";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push, refresh: () => {} }),
  usePathname: () => "/dashboard",
}));

import middleware from "@/middleware";
import { useCommandBarActions } from "@/app/(protected)/_components/layout/protected-command-bar-provider/hooks";
import { visibleSidebarItems } from "@/app/(protected)/_components/layout/protected-sidebar-menu";
import { canAccessPath, readablePermissionKeys } from "@/lib/route-access";

import type { PermissionKey } from "@/lib/permissions";

/**
 * "Documentação da API" in the product (DOCS-01, decisions 11.1 and 16.60):
 * offered in ⌘K to exactly who reaches Integrações — DELIVERIES and
 * `integration_manage`, the MASTER always, a driver never — through the one
 * registry every surface reads. The sidebar no longer carries a button for it
 * (decision 16.60): the public site's footer links the portal, which stays
 * public.
 */

(globalThis as { React?: typeof React }).React ??= React;

type Role = "MASTER" | "BUSINESS_ADMIN" | "BUSINESS_USER";

interface Session {
  role: Role;
  permissions?: PermissionKey[];
  driverId?: string | null;
  enabledModules: string[] | null;
}

const BOTH = ["FLEET", "DELIVERIES"];

const OFFERED: Record<string, Session> = {
  master: { role: "MASTER", enabledModules: [] },
  admin: { role: "BUSINESS_ADMIN", enabledModules: BOTH },
  "employee with Integrações": {
    role: "BUSINESS_USER",
    permissions: ["delivery_manage", "integration_manage"],
    enabledModules: BOTH,
  },
};

const NOT_OFFERED: Record<string, Session> = {
  "admin without Entregas": {
    role: "BUSINESS_ADMIN",
    enabledModules: ["FLEET"],
  },
  "employee without Integrações": {
    role: "BUSINESS_USER",
    permissions: ["delivery_manage"],
    enabledModules: BOTH,
  },
  "employee with Integrações but no Entregas": {
    role: "BUSINESS_USER",
    permissions: ["integration_manage"],
    enabledModules: ["FLEET"],
  },
  driver: { role: "BUSINESS_USER", driverId: "driver-1", enabledModules: BOTH },
  "employee without a profile": { role: "BUSINESS_USER", enabledModules: BOTH },
};

function userOf(session: Session) {
  return {
    role: session.role,
    permissions: session.permissions,
    driverId: session.driverId,
    enabledModules: session.enabledModules ?? undefined,
  };
}

function paletteOffers(session: Session): boolean {
  const { actions } = useCommandBarActions({
    user: {
      role: session.role,
      driverId: session.driverId,
      permissions: (session.permissions ?? []).map((permissionKey) => ({
        permissionKey,
        canRead: true,
      })),
    },
    enabledModules: session.enabledModules,
  });

  return actions.some((action) => action.path === "/docs");
}

/** The palette's verdict for /docs, through the same registry as Integrações. */
function canSeeApiDocs(session: Session): boolean {
  return paletteOffers(session);
}

describe("who is offered the developer portal", () => {
  it.each(Object.keys(OFFERED))("the %s is", (name) => {
    const session = OFFERED[name];

    expect(paletteOffers(session)).toBe(true);
  });

  it.each(Object.keys(NOT_OFFERED))("the %s is not", (name) => {
    const session = NOT_OFFERED[name];

    expect(paletteOffers(session)).toBe(false);
  });

  it("follows exactly the rule of Integrações", () => {
    for (const session of [
      ...Object.values(OFFERED),
      ...Object.values(NOT_OFFERED),
    ]) {
      if (
        !session.permissions &&
        session.role === "BUSINESS_USER" &&
        !session.driverId
      )
        continue;

      const context = {
        role: session.role,
        permissions: session.permissions ?? [],
        enabledModules: session.enabledModules,
        isDriver: Boolean(session.driverId),
      };

      const integrations =
        session.role === "MASTER"
          ? "/admin/integrations"
          : "/dashboard/integrations";

      expect(canSeeApiDocs(session)).toBe(canAccessPath(integrations, context));
    }
  });

  it("does not open for a read row the profile saved without read access", () => {
    const permissions = readablePermissionKeys([
      { permissionKey: "integration_manage", canRead: false },
    ]);

    expect(
      canAccessPath("/docs", {
        role: "BUSINESS_USER",
        permissions,
        enabledModules: BOTH,
        isDriver: false,
      }),
    ).toBe(false);
  });
});

describe("where the product shows it", () => {
  it("no longer mounts a docs button in the sidebar footer", () => {
    // Red before decision 16.60: the layout imported and rendered
    // ProtectedApiDocsButton above "Obter Aplicativo".
    const layoutDir = path.resolve(
      __dirname,
      "../../src/app/(protected)/_components/layout",
    );
    const layout = readFileSync(
      path.join(layoutDir, "protected-default-layout/index.tsx"),
      "utf8",
    );

    expect(layout).not.toMatch(/ApiDocsButton|API_DOCS_PATH|href="\/docs"/);
    expect(existsSync(path.join(layoutDir, "protected-api-docs-button"))).toBe(
      false,
    );
  });

  it("opens it from ⌘K in a new tab", () => {
    const open = vi.fn();

    vi.stubGlobal("window", { open });
    navigation.push.mockClear();

    try {
      const { actions } = useCommandBarActions({
        user: { role: "BUSINESS_ADMIN", driverId: null, permissions: [] },
        enabledModules: BOTH,
      });

      actions.find((action) => action.path === "/docs")!.perform();

      // Same-tab, the palette took the user out of the app it was opened in.
      expect(open).toHaveBeenCalledWith(
        "/docs",
        "_blank",
        "noopener,noreferrer",
      );
      expect(navigation.push).not.toHaveBeenCalled();

      // Every other entry still navigates inside the app.
      actions
        .find((action) => action.path === "/dashboard/integrations")!
        .perform();

      expect(navigation.push).toHaveBeenCalledWith("/dashboard/integrations");
      expect(open).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("keeps it out of the sidebar menu list", () => {
    const items = visibleSidebarItems(userOf(OFFERED.admin), BOTH)
      .flatMap((item) => (item.items?.length ? item.items : [item]))
      .map((item) => item.url);

    expect(items).not.toContain("/docs");
  });
});

describe("the portal stays public", () => {
  function jwt(payload: Record<string, unknown>): string {
    const encode = (value: object) =>
      Buffer.from(JSON.stringify(value)).toString("base64url");

    return `${encode({ alg: "HS256", typ: "JWT" })}.${encode(payload)}.signature`;
  }

  function requestFor(
    path: string,
    role?: string,
    driverId: string | null = null,
  ) {
    const token = role
      ? jwt({ role, driverId, exp: Math.floor(Date.now() / 1000) + 3600 })
      : undefined;

    return new NextRequest(`http://app.test${path}`, {
      headers: token ? { cookie: `tkey=${token}; rkey=refresh` } : {},
    });
  }

  const env = { ...process.env };

  beforeEach(() => {
    process.env.HTTP_REQUEST = "http://api.test";
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    process.env = { ...env };
    vi.unstubAllGlobals();
  });

  it.each([
    ["a visitor with no session", undefined, null],
    ["an employee without Integrações", "BUSINESS_USER", null],
    ["a driver", "BUSINESS_USER", "driver-1"],
  ])("opens for %s", async (_name, role, driverId) => {
    for (const path of ["/docs", "/docs/autenticacao", "/docs/referencia"]) {
      const response = await middleware(requestFor(path, role, driverId));

      expect(response.headers.get("location"), path).toBeNull();
    }
  });
});
