import * as React from "react";
import { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";

import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

/**
 * What a link costs before anyone clicks it.
 *
 * In Next 14 (no PPR) the router's automatic prefetch of a link that differs
 * from the page on screen only by its query renders the WHOLE page on the
 * server: the loading.tsx cut-off applies under a segment, and the render
 * starts at the page segment itself. So each tab of Entregas — and each view
 * of the Torre — was rendered with its data as soon as the strip was drawn,
 * and the sidebar's link to the page already open rendered it a second time:
 * 24 API calls to open one tab. The strips and the link to the page on
 * screen do not prefetch; the other menu entries keep the cheap prefetch
 * that stops at their loading.tsx.
 *
 * The Torre's menu entry also carries the view this browser chose last, so
 * the server renders it at once instead of rendering Rotas and replacing it
 * on the client (a flash and a second render).
 */
const navigation = vi.hoisted(() => ({ pathname: "/dashboard/deliveries" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("next/link", async () => {
  const { createElement: h, forwardRef } = await import("react");

  return {
    default: forwardRef<HTMLAnchorElement, Record<string, unknown>>(
      ({ href, children, prefetch, ...rest }, ref) =>
        h(
          "a",
          {
            ...rest,
            href: String(href),
            "data-prefetch": String(prefetch),
            ref,
          },
          children as never,
        ),
    ),
  };
});

vi.mock("@/features/deliveries/chat/lib/use-chat-unread", () => ({
  useChatUnreadCount: () => 0,
  useTicketsSummary: () => null,
}));

vi.mock("@/store/auth-store", () => ({
  useAuthStore: (selector: (value: Record<string, unknown>) => unknown) =>
    selector({
      role: null,
      permissions: [],
      enabledModules: ["FLEET", "DELIVERIES"],
    }),
}));

// The sidebar primitives need their provider; the links are what is read.
vi.mock("@/components/ui/sidebar", async () => {
  const { createElement: h, Fragment } = await import("react");
  const pass = ({ children }: { children?: ReactNode }) =>
    h(Fragment, null, children);

  return {
    SidebarMenu: pass,
    SidebarMenuBadge: pass,
    SidebarMenuButton: pass,
    SidebarMenuItem: pass,
    SidebarMenuSub: pass,
    SidebarMenuSubButton: pass,
    SidebarMenuSubItem: pass,
  };
});

import { SegmentedNav } from "@/components/ui/segmented-nav";
import { ProtectedSidebarMenuItems } from "@/app/(protected)/_components/layout/protected-sidebar-menu";
import {
  TOWER_VIEW_STORAGE_KEY,
  rememberTowerView,
} from "@/features/control-tower/lib/views";

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal("React", React);
});

let root: Root | null = null;

beforeEach(() => {
  navigation.pathname = "/dashboard/deliveries";
  localStorage.clear();
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

async function mount(element: React.ReactElement): Promise<HTMLElement> {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  await act(async () => {
    root!.render(element);
  });

  return host;
}

const links = (host: HTMLElement) => [
  ...host.querySelectorAll<HTMLAnchorElement>("a"),
];

describe("a section strip (Entregas, the Torre, Integrações)", () => {
  it("never prefetches its sections: each would be a full server render", async () => {
    const host = await mount(
      createElement(SegmentedNav, {
        label: "Seções de entregas",
        activeValue: "deliveries",
        hrefFor: (value: string) => `?tab=${value}`,
        items: [
          { value: "deliveries", label: "Entregas" },
          { value: "shippers", label: "Embarcadores" },
          { value: "imports", label: "Importações" },
        ],
      }),
    );

    // Non-vacuous: the desk strip draws every section.
    expect(links(host).length).toBeGreaterThanOrEqual(3);

    for (const link of links(host)) {
      expect(link.dataset.prefetch, link.href).toBe("false");
    }
  });
});

const ADMIN = {
  role: "BUSINESS_ADMIN" as const,
  permissions: [],
  driverId: null,
  enabledModules: ["FLEET", "DELIVERIES"],
};

function link(host: HTMLElement, path: string): HTMLAnchorElement {
  const found = links(host).find(
    (anchor) => anchor.getAttribute("href")?.split("?")[0] === path,
  );

  expect(
    found,
    `${path} in ${links(host).map((a) => a.getAttribute("href"))}`,
  ).toBeDefined();

  return found!;
}

describe("the sidebar", () => {
  it("does not prefetch the page already on screen, and keeps the others' prefetch", async () => {
    const host = await mount(
      createElement(ProtectedSidebarMenuItems, { user: ADMIN }),
    );

    expect(link(host, "/dashboard/deliveries").dataset.prefetch).toBe("false");
    // Another page: the automatic prefetch, which stops at its loading.tsx.
    expect(link(host, "/dashboard/control-tower").dataset.prefetch).toBe(
      "undefined",
    );
  });

  it("opens the Torre on the view this browser chose last", async () => {
    localStorage.setItem(TOWER_VIEW_STORAGE_KEY, "panel");

    const host = await mount(
      createElement(ProtectedSidebarMenuItems, { user: ADMIN }),
    );

    expect(link(host, "/dashboard/control-tower").getAttribute("href")).toBe(
      "/dashboard/control-tower?view=panel",
    );
  });

  it("follows a view chosen while the menu is on screen", async () => {
    navigation.pathname = "/dashboard/control-tower";

    const host = await mount(
      createElement(ProtectedSidebarMenuItems, { user: ADMIN }),
    );

    expect(link(host, "/dashboard/control-tower").getAttribute("href")).toBe(
      "/dashboard/control-tower",
    );

    await act(async () => {
      rememberTowerView("audit");
    });

    expect(link(host, "/dashboard/control-tower").getAttribute("href")).toBe(
      "/dashboard/control-tower?view=audit",
    );
  });

  it("opens the bare Torre when nothing was chosen, or the choice is unknown", async () => {
    localStorage.setItem(TOWER_VIEW_STORAGE_KEY, "constructor");

    const host = await mount(
      createElement(ProtectedSidebarMenuItems, { user: ADMIN }),
    );

    expect(link(host, "/dashboard/control-tower").getAttribute("href")).toBe(
      "/dashboard/control-tower",
    );
  });
});
