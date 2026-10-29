import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  Suspense,
  createElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderHtml } from "./helpers/render-html";

/**
 * The sidebar's open/collapsed choice survives a reload.
 *
 * The sidebar wrote `sidebar:state` on every toggle and nothing ever read it:
 * a menu the person collapsed opened again on every full load, and the
 * Cookie Policy had to say "a plataforma não lê esse cookie". The protected
 * layout reads it now and hands it to the provider as `defaultOpen`.
 *
 * The two providers the layout wraps (notifications and the /user/me gate)
 * are async server components with network calls; they are passed through
 * here, since what is under test is the cookie reaching the sidebar.
 */
const jar = vi.hoisted(() => ({ cookies: new Map<string, string>() }));

vi.mock("next/headers", () => ({
  cookies: () => ({
    get: (name: string) =>
      jar.cookies.has(name)
        ? { name, value: jar.cookies.get(name)! }
        : undefined,
  }),
}));

vi.mock(
  "@/app/(protected)/_components/layout/protected-provider/notifications-provider",
  () => ({
    NotificationsProvider: ({ children }: { children: ReactNode }) => children,
  }),
);

vi.mock("@/app/(protected)/_components/layout/protected-provider", () => ({
  ProtectedProvider: ({ children }: { children: ReactNode }) => children,
}));

import RootProtectedLayout from "@/app/(protected)/layout";
import { SidebarWrapper } from "@/app/(protected)/_components/layout/protected-provider/sidebar-wrapper";
import { useSidebar } from "@/components/ui/sidebar";
import { SIDEBAR_COOKIE_NAME, readSidebarOpen } from "@/lib/sidebar-state";

function SidebarState(): JSX.Element {
  const { state } = useSidebar();

  return createElement("output", { "data-sidebar-state": state });
}

/** The protected tree as a page sees it, with the sidebar inside. */
function renderLayout(): string {
  return renderHtml(
    createElement(RootProtectedLayout, {
      children: createElement(
        SidebarWrapper,
        null,
        createElement(SidebarState),
      ),
    }),
  );
}

/** The layout's Suspense fallback, awaited and rendered as a full load shows it. */
async function renderLoadingSkeleton(): Promise<string> {
  const find = (node: unknown): ReactElement | undefined => {
    if (!isValidElement(node)) return undefined;
    if (node.type === Suspense) return node;

    const { children } = node.props as { children?: ReactNode };

    return (Array.isArray(children) ? children : [children])
      .map(find)
      .find(Boolean);
  };

  const suspense = find(RootProtectedLayout({ children: null }));

  expect(
    suspense,
    "o layout não tem mais o Suspense do carregamento",
  ).toBeDefined();

  const fallback = (suspense!.props as { fallback: ReactElement }).fallback;
  const Loading = fallback.type as (props: unknown) => Promise<ReactElement>;

  return renderHtml(await Loading(fallback.props));
}

/** The height classes of the skeleton's header, the one bordered bar. */
function headerHeights(html: string): string[] {
  const header = html.match(/class="([^"]*\bborder-b\b[^"]*)"/);

  expect(header, "o cabeçalho do esqueleto sumiu").not.toBeNull();

  return header![1]
    .split(/\s+/)
    .filter((name) => /^(?:[a-z]+:)?h-\d+$/.test(name));
}

beforeEach(() => {
  jar.cookies.clear();
});

describe("reading sidebar:state", () => {
  const store = (value?: string) => ({
    get: (name: string) =>
      name === SIDEBAR_COOKIE_NAME && value !== undefined
        ? { value }
        : undefined,
  });

  it("collapses only on an explicit false", () => {
    expect(SIDEBAR_COOKIE_NAME).toBe("sidebar:state");
    expect(readSidebarOpen(store("false"))).toBe(false);
    expect(readSidebarOpen(store("true"))).toBe(true);
    expect(readSidebarOpen(store())).toBe(true);
    expect(readSidebarOpen(store("lixo"))).toBe(true);
  });
});

describe("the protected layout", () => {
  it("opens the sidebar collapsed when the person left it collapsed", () => {
    jar.cookies.set("sidebar:state", "false");

    expect(renderLayout()).toContain('data-sidebar-state="collapsed"');
  });

  it("opens it expanded when the cookie says so, or when there is none", () => {
    jar.cookies.set("sidebar:state", "true");
    expect(renderLayout()).toContain('data-sidebar-state="expanded"');

    jar.cookies.clear();
    expect(renderLayout()).toContain('data-sidebar-state="expanded"');
  });
});

describe("the loading skeleton of a full load", () => {
  it("draws the collapsed rail when the person left the menu collapsed", async () => {
    jar.cookies.set("sidebar:state", "false");

    const html = await renderLoadingSkeleton();

    expect(html).toContain('data-sidebar-skeleton="collapsed"');
    expect(html).toMatch(
      /class="w-12 [^"]*"[^>]*data-sidebar-skeleton="collapsed"/,
    );
    expect(html).not.toContain("w-64");
    expect(headerHeights(html)).toContain("md:h-12");
  });

  it("keeps the phone header at h-14 when the cookie says collapsed", async () => {
    // Below md the rail is hidden and the sidebar hydrates as a closed sheet,
    // so the real header is h-14: an unprefixed h-12 here jumped on phones.
    jar.cookies.set("sidebar:state", "false");

    const heights = headerHeights(await renderLoadingSkeleton());

    expect(heights).toContain("h-14");
    expect(heights).not.toContain("h-12");
  });

  it("draws the full menu when it is open, or when there is no cookie", async () => {
    jar.cookies.set("sidebar:state", "true");
    expect(await renderLoadingSkeleton()).toContain(
      'data-sidebar-skeleton="expanded"',
    );

    jar.cookies.clear();

    const html = await renderLoadingSkeleton();

    expect(html).toMatch(
      /class="w-64 [^"]*"[^>]*data-sidebar-skeleton="expanded"/,
    );
    expect(headerHeights(html)).toEqual(["h-14"]);
  });
});

describe("the loading skeleton of a driver's full load (decision 4.8)", () => {
  /** An access token as the layout reads it: only the payload is decoded. */
  function driverToken(): string {
    const payload = btoa(
      JSON.stringify({
        role: "BUSINESS_USER",
        driverId: "018f0000-0000-7000-8000-0000000000d1",
      }),
    );

    return `header.${payload}.signature`;
  }

  /** How many menu rows the skeleton draws in its sidebar. */
  function menuRows(html: string, state: "expanded" | "collapsed"): number {
    const sidebar = html.match(
      new RegExp(
        `data-sidebar-skeleton="${state}"[^>]*>([\\s\\S]*?)<div class="mt-auto`,
      ),
    );

    expect(sidebar, `sem a barra lateral ${state}`).not.toBeNull();

    const rows =
      state === "expanded"
        ? /class="[^"]*h-6 w-full/g
        : /class="[^"]*h-8 w-8 rounded-md/g;

    return sidebar![1].match(rows)?.length ?? 0;
  }

  it("draws the driver's sidebar, not a bare header, sized on the driver's menu", async () => {
    jar.cookies.set("tkey", driverToken());

    const html = await renderLoadingSkeleton();

    // It drew only a header with logo, search and account: the real shell
    // has had the same sidebar as the office since decision 4.8.
    expect(html).toMatch(
      /class="w-64 [^"]*"[^>]*data-sidebar-skeleton="expanded"/,
    );
    expect(menuRows(html, "expanded")).toBe(3);
    expect(headerHeights(html)).toEqual(["h-14"]);
  });

  it("follows the cookie like the office: the rail when the driver left it collapsed", async () => {
    jar.cookies.set("tkey", driverToken());
    jar.cookies.set("sidebar:state", "false");

    const html = await renderLoadingSkeleton();

    expect(html).toMatch(
      /class="w-12 [^"]*"[^>]*data-sidebar-skeleton="collapsed"/,
    );
    expect(menuRows(html, "collapsed")).toBe(3);
    expect(headerHeights(html)).toEqual(["h-14", "md:h-12"]);
  });
});

describe("the real header of a collapsed sidebar", () => {
  /** The static class list of the shell's <header>. */
  function headerClasses(file: string): string[] {
    const source = readFileSync(resolve(process.cwd(), file), "utf8");
    const header = source.match(/<header\s+className="([^"]*)"/);

    expect(
      header,
      `${file}: <header className="..."> não encontrado`,
    ).not.toBeNull();

    return header![1].split(/\s+/).filter(Boolean);
  }

  it.each([
    "src/app/(protected)/_components/layout/protected-default-layout/index.tsx",
    "src/app/(protected)/_components/layout/protected-driver-layout/index.tsx",
  ])("%s shrinks only from md, as the skeleton does", (file) => {
    // The desktop sidebar (`hidden md:block`) carries data-collapsible=icon
    // in the server render even on a phone, because useIsMobile is false
    // until mounted: an unprefixed h-12 painted the phone header short, then
    // it jumped to h-14 when the sheet replaced the sidebar.
    const classes = headerClasses(file);

    expect(classes).toContain("h-14");
    expect(classes).toContain(
      "md:group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12",
    );
    expect(classes).not.toContain(
      "group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12",
    );
  });
});
