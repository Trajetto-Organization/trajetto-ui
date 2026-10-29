import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider, useQuery } from "react-query";

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
 * The Torre de controle's views (product meeting of 14/10/2026).
 *
 * Entregas mixed the registrations with the operation: Monitoramento,
 * Ocorrências, Atendimentos and Auditoria were tabs between Embarcadores and
 * Motivos, and the Torre was a single panel. The meeting made them views of
 * the Torre — the board by route as the default — that refresh on a
 * cadence the dispatcher picks (1, 3 or 5 min), go full screen for a TV, and
 * remember the last view per browser. Old links to the tabs must still land
 * on the right screen: notifications, e-mails and bookmarks carry them.
 */
const navigation = vi.hoisted(() => ({
  search: "",
  pathname: "/dashboard/control-tower",
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: navigation.push,
    replace: navigation.replace,
    refresh: navigation.refresh,
  }),
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(navigation.search),
}));

const tickets = vi.hoisted(() => ({
  counts: null as null | {
    open: number;
    unassigned: number;
    mine: number;
    pendingAuthorization: number;
    unreadOpen: number;
  },
}));

vi.mock("@/features/deliveries/chat/lib/use-chat-unread", () => ({
  useTicketsSummary: () => tickets.counts,
  useChatUnreadCount: () => tickets.counts?.unreadOpen ?? 0,
}));

const auth = vi.hoisted(() => ({
  role: null as string | null,
  permissions: [] as unknown[],
}));

vi.mock("@/store/auth-store", () => ({
  useAuthStore: (selector: (value: Record<string, unknown>) => unknown) =>
    selector({
      role: auth.role,
      permissions: auth.permissions,
      enabledModules: ["DELIVERIES"],
    }),
}));

import {
  DEFAULT_TOWER_VIEW,
  TOWER_VIEWS,
  TOWER_VIEW_STORAGE_KEY,
  accessibleTowerViews,
  parseTowerView,
  towerViewHref,
} from "@/features/control-tower/lib/views";
import {
  TOWER_REFRESH_STORAGE_KEY,
  readTowerRefreshMinutes,
} from "@/features/control-tower/lib/refresh-interval";
import {
  DELIVERY_TABS,
  movedDeliveryTabHref,
} from "@/features/deliveries/lib/tabs";
import { ControlTowerViewTabs } from "@/features/control-tower/views/tabs";
import { ControlTowerShell } from "@/features/control-tower/shell";
import {
  buildChatSearchParams,
  buildTicketSearchParams,
  ticketsHref,
} from "@/features/deliveries/chat/lib/chat-link";
import { queueTicketHref } from "@/features/deliveries/occurrence-authorizations/rules";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal("React", React);
});

let root: Root | null = null;

beforeEach(() => {
  navigation.search = "";
  navigation.pathname = "/dashboard/control-tower";
  navigation.push.mockClear();
  navigation.replace.mockClear();
  navigation.refresh.mockClear();
  tickets.counts = null;
  auth.role = null;
  auth.permissions = [];
  localStorage.clear();
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
  vi.useRealTimers();
});

async function mount(element: React.ReactElement, client = new QueryClient()) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  await act(async () => {
    root!.render(createElement(QueryClientProvider, { client }, element));
  });

  return host;
}

const READ_ONLY = {
  role: "BUSINESS_USER" as const,
  permissions: ["delivery_manage"] as never,
  enabledModules: ["DELIVERIES"],
};

describe("the views", () => {
  it("open on the board by route, and fall back like the tabs did", () => {
    expect(DEFAULT_TOWER_VIEW).toBe("routes");
    expect(TOWER_VIEWS.map((view) => view.label)).toEqual([
      "Rotas",
      "Painel",
      "Ocorrências",
      "Atendimentos",
      "Auditoria",
    ]);

    expect(parseTowerView(null)).toBe("routes");
    expect(parseTowerView("nao-existe")).toBe("routes");
    expect(parseTowerView("panel")).toBe("panel");
  });

  it("keep the occurrences behind occurrence_manage, like their old tab", () => {
    const allowed = accessibleTowerViews(READ_ONLY);

    expect(allowed).toEqual(["routes", "panel", "tickets", "audit"]);
    expect(parseTowerView("occurrences", allowed)).toBe("routes");
  });

  it("leave the open view's filters behind when switching", () => {
    const current = new URLSearchParams(
      "businessId=b&view=occurrences&severity=blocking&page=3&ticket=t1",
    );

    expect(towerViewHref(current, "occurrences", "tickets")).toBe(
      "?businessId=b&view=tickets",
    );
    expect(towerViewHref(current, "occurrences", "occurrences")).toBe(
      `?${current.toString()}`,
    );
  });
});

describe("Entregas after the move", () => {
  it("keeps only the registrations and their configuration", () => {
    expect(DELIVERY_TABS.map((tab) => tab.label)).toEqual([
      "Entregas",
      "Embarcadores",
      "Importações",
      "Tipos de Ocorrência",
      "Motivos de Status",
      "Mensagens ao Cliente",
    ]);
  });

  it("sends the old links of each moved tab to its view, with every other param", () => {
    expect(
      movedDeliveryTabHref("/dashboard", {
        tab: "monitoring",
        view: "drivers",
      }),
    ).toBe("/dashboard/control-tower?view=routes");

    expect(
      movedDeliveryTabHref("/admin", {
        tab: "occurrences",
        businessId: "b1",
        search: "ana",
        severity: "blocking",
        page: "2",
      }),
    ).toBe(
      "/admin/control-tower?businessId=b1&search=ana&severity=blocking&page=2&view=occurrences",
    );

    expect(
      movedDeliveryTabHref("/dashboard", { tab: "chat", ticket: "tk1" }),
    ).toBe("/dashboard/control-tower?ticket=tk1&view=tickets");

    expect(movedDeliveryTabHref("/dashboard", { tab: "proof-audits" })).toBe(
      "/dashboard/control-tower?view=audit",
    );
  });

  it("leaves the links of the tabs that stayed alone", () => {
    expect(movedDeliveryTabHref("/dashboard", { tab: "shippers" })).toBeNull();
    expect(movedDeliveryTabHref("/dashboard", {})).toBeNull();
  });
});

describe("the links into the tickets", () => {
  it("open the Torre's Atendimentos, keeping only the company", () => {
    const params = buildTicketSearchParams(
      "businessId=b1&tab=deliveries&period=7d&status=FAILED",
      "tk1",
    );

    expect(Object.fromEntries(params)).toEqual({
      businessId: "b1",
      view: "tickets",
      ticket: "tk1",
    });
    expect(ticketsHref("/admin/deliveries", params)).toBe(
      "/admin/control-tower?businessId=b1&view=tickets&ticket=tk1",
    );
    expect(ticketsHref(null, params)).toMatch(/^\/dashboard\/control-tower\?/);

    expect(
      buildChatSearchParams("page=2", {
        driver: { id: "d1", name: "Ana" },
      }).get("view"),
    ).toBe("tickets");
  });

  it("from the authorization queue, too", () => {
    expect(
      queueTicketHref(
        "/admin/control-tower",
        "businessId=b1&view=panel",
        "tk1",
      ),
    ).toBe("/admin/control-tower?businessId=b1&view=tickets&ticket=tk1");
  });
});

describe("the views strip", () => {
  const ticketsLink = (host: HTMLElement) =>
    [...host.querySelectorAll<HTMLAnchorElement>("a")].find(
      (link) =>
        link.getAttribute("data-tutorial") === "control-tower-view-tickets",
    );

  it("badges Atendimentos with the unread tickets, moved from Entregas", async () => {
    tickets.counts = {
      open: 3,
      unassigned: 0,
      mine: 1,
      pendingAuthorization: 0,
      unreadOpen: 2,
    };

    const host = await mount(
      createElement(ControlTowerViewTabs, { activeView: "routes" }),
    );

    const link = ticketsLink(host)!;

    expect(link.textContent).toContain("Atendimentos");
    expect(
      link.querySelector("[aria-label='2 atendimentos não lidos']"),
    ).not.toBeNull();
    expect(link.querySelector("[data-authorization-dot]")).toBeNull();
    expect(link.getAttribute("href")).toBe("?view=tickets");
  });

  it("shows the red dot while a driver waits for the tower", async () => {
    tickets.counts = {
      open: 1,
      unassigned: 0,
      mine: 0,
      pendingAuthorization: 1,
      unreadOpen: 0,
    };

    const host = await mount(
      createElement(ControlTowerViewTabs, { activeView: "routes" }),
    );

    expect(
      ticketsLink(host)!
        .querySelector("[data-authorization-dot]")
        ?.getAttribute("aria-label"),
    ).toBe("1 pedido aguardando autorização");
  });

  it("hides a view the live session may not read", async () => {
    auth.role = "BUSINESS_USER";
    auth.permissions = [
      { permissionKey: "delivery_manage", canRead: true, canWrite: false },
    ];

    const host = await mount(
      createElement(ControlTowerViewTabs, { activeView: "routes" }),
    );

    const labels = [...host.querySelectorAll("a")].map(
      (link) => link.getAttribute("data-tutorial") ?? "",
    );

    expect(labels.some((label) => label.endsWith("-occurrences"))).toBe(false);
    expect(labels.some((label) => label.endsWith("-panel"))).toBe(true);
  });
});

function shell(
  props: Partial<React.ComponentProps<typeof ControlTowerShell>> = {},
) {
  return createElement(ControlTowerShell, {
    view: "routes",
    urlNamedView: true,
    allowedViews: ["routes", "panel", "occurrences", "tickets", "audit"],
    renderedAt: Date.now(),
    header: null,
    children: createElement("p", null, "conteúdo"),
    ...props,
  });
}

describe("the last view of this browser", () => {
  it("is remembered when the URL names one", async () => {
    await mount(shell({ view: "audit", urlNamedView: true }));

    expect(localStorage.getItem(TOWER_VIEW_STORAGE_KEY)).toBe("audit");
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("reopens when the Torre is opened with no view", async () => {
    localStorage.setItem(TOWER_VIEW_STORAGE_KEY, "tickets");
    navigation.search = "businessId=b1";

    await mount(shell({ view: "routes", urlNamedView: false }));

    expect(navigation.replace).toHaveBeenCalledWith(
      "?businessId=b1&view=tickets",
      { scroll: false },
    );
  });

  it("is not reopened when the session may no longer read it", async () => {
    localStorage.setItem(TOWER_VIEW_STORAGE_KEY, "occurrences");

    await mount(
      shell({
        view: "routes",
        urlNamedView: false,
        allowedViews: ["routes", "panel"],
      }),
    );

    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("survives a browser that refuses storage", async () => {
    const getItem = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("SecurityError");
      });

    try {
      const host = await mount(shell({ urlNamedView: false }));

      expect(host.textContent).toContain("conteúdo");
      expect(readTowerRefreshMinutes()).toBe(1);
    } finally {
      getItem.mockRestore();
    }
  });
});

describe("the refresh cadence", () => {
  it("reads every minute by default and says when it last did", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });

    const client = new QueryClient();
    const board = vi.fn(async () => ["rota"]);

    const Board = () => {
      useQuery(["route_monitoring", "session", 1], board);
      return null;
    };

    const host = await mount(
      createElement(ControlTowerShell, {
        view: "routes",
        urlNamedView: true,
        allowedViews: ["routes"],
        renderedAt: Date.now(),
        header: null,
        children: createElement(Board),
      }),
      client,
    );

    await act(async () => {
      await Promise.resolve();
    });

    const cadence = () =>
      host.querySelector("[data-tower-cadence]")?.textContent ?? "";

    expect(cadence()).toContain("Atualiza a cada 1 min");
    expect(cadence()).toMatch(/Atualizado às \d{2}:\d{2}/);

    const reads = board.mock.calls.length;

    // One minute: the board is read again, and the server part re-rendered.
    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(board.mock.calls.length).toBe(reads + 1);
    expect(navigation.refresh).toHaveBeenCalledTimes(1);
  });

  it("switches to 3 or 5 minutes and keeps the choice in this browser", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });

    const host = await mount(shell());

    // The product's select (decision of 28/10/2026), not the browser's.
    const trigger = host.querySelector<HTMLElement>(
      "[data-tower-refresh-select]",
    )!;

    expect(host.querySelector("select:not([aria-hidden])")).toBeNull();
    expect(trigger.getAttribute("role")).toBe("combobox");
    expect(trigger.textContent).toContain("1 min");

    // Named by the words beside it and its own value.
    const name = (trigger.getAttribute("aria-labelledby") ?? "")
      .split(" ")
      .map((id) => document.getElementById(id)?.textContent ?? "")
      .join(" ");

    expect(name).toBe("Atualizar a cada 1 min");

    // By keyboard, as a person would: Enter opens, Enter picks.
    await act(async () => {
      trigger.focus();
      trigger.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      );
    });

    const options = [
      ...document.querySelectorAll<HTMLElement>("[role='option']"),
    ];

    expect(options.map((option) => option.textContent)).toEqual([
      "1 min",
      "3 min",
      "5 min",
    ]);

    await act(async () => {
      const five = options.find((option) => option.textContent === "5 min")!;

      five.focus();
      five.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      );
    });

    expect(trigger.textContent).toContain("5 min");
    expect(localStorage.getItem(TOWER_REFRESH_STORAGE_KEY)).toBe("5");
    expect(host.querySelector("[data-tower-cadence]")?.textContent).toContain(
      "Atualiza a cada 5 min",
    );

    // Not at one minute any more: at five.
    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });
    expect(navigation.refresh).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(4 * 60_000);
    });
    expect(navigation.refresh).toHaveBeenCalledTimes(1);
  });

  it("opens on the interval this browser chose before", async () => {
    localStorage.setItem(TOWER_REFRESH_STORAGE_KEY, "3");

    const host = await mount(shell());

    expect(
      host.querySelector("[data-tower-refresh-select]")?.textContent,
    ).toContain("3 min");
    expect(host.querySelector("[data-tower-cadence]")?.textContent).toContain(
      "Atualiza a cada 3 min",
    );
  });
});

/**
 * What the cadence row promises (review of 27/10/2026): a frame with nothing
 * live re-rendered the server every minute; "Atualizado às" was the
 * browser's clock while the board speaks the company's, and took the newest
 * answer of ANY cached query of the view — another company's included; and
 * a screen reader heard the line every minute.
 */
describe("the cadence row", () => {
  it("schedules nothing on a frame with nothing live (company prompt, refusal)", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });

    const client = new QueryClient();
    const invalidate = vi.spyOn(client, "invalidateQueries");

    const host = await mount(shell({ view: "routes", live: false }), client);

    await act(async () => {
      vi.advanceTimersByTime(5 * 60_000);
    });

    expect(navigation.refresh).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
    // And it does not claim a cadence that is not running.
    expect(host.querySelector("[data-tower-cadence]")).toBeNull();
    expect(host.querySelector("[data-tower-refresh-select]")).toBeNull();
    // The full screen stays: a refusal reached on a TV needs the way out.
    expect(
      host.querySelector("[data-tutorial='control-tower-fullscreen']"),
    ).not.toBeNull();
  });

  it("says the time in the company's zone, as the board does", async () => {
    // 15:00 UTC: 12:00 in São Paulo, 11:00 in Manaus.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-28T15:00:00.000Z"));

    const client = new QueryClient();

    const Board = () => {
      useQuery(["route_monitoring", "session", 1], async () => ({
        day: "2026-10-28",
        timeZone: "America/Manaus",
        routes: [],
      }));
      return null;
    };

    const host = await mount(
      shell({
        view: "routes",
        renderedAt: Date.now(),
        children: createElement(Board),
      }),
      client,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(host.querySelector("[data-tower-cadence]")?.textContent).toContain(
      "Atualizado às 11:00",
    );
  });

  it("reads only the view's active queries, never another company's left in the cache", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-28T15:00:00.000Z"));

    const hour = (iso: string) =>
      new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" }).format(
        new Date(iso),
      );

    const client = new QueryClient();

    // The previous company's queue, answered later than anything on screen:
    // still cached, no longer observed (the panel is keyed by company).
    client.setQueryData(["proof_audit", "company-a", "pending", 1], []);
    client
      .getQueryCache()
      .find(["proof_audit", "company-a", "pending", 1])!.state.dataUpdatedAt =
      Date.parse("2026-10-28T15:30:00.000Z");

    const host = await mount(
      shell({ view: "audit", children: createElement("p", null, "fila") }),
      client,
    );

    const cadence = () =>
      host.querySelector("[data-tower-cadence]")?.textContent ?? "";

    // Nothing of this view is on screen yet: no time to give.
    expect(cadence()).toContain("Atualiza a cada");
    expect(cadence()).not.toMatch(/Atualizado/);

    const Queue = () => {
      useQuery(["proof_audit", "company-b", "pending", 1], async () => []);
      return null;
    };

    await act(async () => {
      root!.render(
        createElement(
          QueryClientProvider,
          { client },
          shell({ view: "audit", children: createElement(Queue) }),
        ),
      );
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(cadence()).toContain(
      `Atualizado às ${hour("2026-10-28T15:00:00.000Z")}`,
    );
    expect(cadence()).not.toContain(hour("2026-10-28T15:30:00.000Z"));
  });

  it("is not a live region announced every minute", async () => {
    const host = await mount(shell());

    const cadence = host.querySelector("[data-tower-cadence]")!;

    expect(cadence.getAttribute("aria-live")).toBeNull();
    expect(cadence.closest("[aria-live]")).toBeNull();
  });
});

/** happy-dom has no Fullscreen API: the test defines what the browser would. */
function defineDocument(name: string, get: () => unknown): () => void {
  Object.defineProperty(document, name, { configurable: true, get });

  return () => {
    delete (document as unknown as Record<string, unknown>)[name];
  };
}

describe("the full screen", () => {
  const fullscreenButton = (host: HTMLElement) =>
    host.querySelector<HTMLButtonElement>(
      "[data-tutorial='control-tower-fullscreen']",
    )!;

  /** What a browser with the Fullscreen API does, on any element. */
  function nativeFullscreen() {
    const state = { current: null as Element | null };

    const request = vi.fn(async function (this: Element) {
      state.current = this;
      document.dispatchEvent(new Event("fullscreenchange"));
    });
    const exit = vi.fn(async () => {
      state.current = null;
      document.dispatchEvent(new Event("fullscreenchange"));
    });

    const undoEnabled = defineDocument("fullscreenEnabled", () => true);
    const undoElement = defineDocument(
      "fullscreenElement",
      () => state.current,
    );
    const original = HTMLElement.prototype.requestFullscreen;

    HTMLElement.prototype.requestFullscreen = request as never;
    (document as { exitFullscreen?: unknown }).exitFullscreen = exit;

    const restore = () => {
      undoEnabled();
      undoElement();
      HTMLElement.prototype.requestFullscreen = original;
      delete (document as { exitFullscreen?: unknown }).exitFullscreen;
    };

    return { state, request, exit, restore };
  }

  it("asks the browser for the whole page, pins the Torre over it, and leaves", async () => {
    const { state, request, exit, restore } = nativeFullscreen();

    try {
      const host = await mount(shell());

      expect(fullscreenButton(host).getAttribute("aria-label")).toBe(
        "Tela cheia",
      );

      await act(async () => {
        fullscreenButton(host).click();
      });

      expect(request).toHaveBeenCalledTimes(1);
      // The whole page goes full screen, and the Torre is pinned over it.
      expect(state.current).toBe(document.documentElement);
      const container = host.querySelector("[data-control-tower-shell]")!;
      expect(container.className).toContain("fixed");
      expect(container.className).toContain("z-40");
      expect(fullscreenButton(host).getAttribute("aria-label")).toBe(
        "Sair da tela cheia",
      );

      await act(async () => {
        fullscreenButton(host).click();
      });

      expect(exit).toHaveBeenCalledTimes(1);
      expect(container.className).not.toContain("fixed");
      expect(fullscreenButton(host).getAttribute("aria-label")).toBe(
        "Tela cheia",
      );
    } finally {
      restore();
    }
  });

  it("keeps the dialogs a view opens on screen and above the Torre", async () => {
    // Autorizar on the queue, a new ticket, the row menu: Radix portals them
    // to the body. On the Torre's own container they opened unseen and the
    // modal froze every click until Esc.
    const browser = nativeFullscreen();

    const Queue = () => {
      const [open, setOpen] = React.useState(false);

      return createElement(
        React.Fragment,
        null,
        createElement(
          "button",
          {
            type: "button",
            "data-open-dialog": "",
            onClick: () => setOpen(true),
          },
          "Autorizar",
        ),
        createElement(
          Dialog,
          { open, onOpenChange: setOpen },
          createElement(
            DialogContent,
            null,
            createElement(DialogTitle, null, "Autorizar ocorrência"),
            createElement(DialogDescription, null, "O motorista aguarda."),
          ),
        ),
      );
    };

    try {
      const host = await mount(shell({ children: createElement(Queue) }));

      await act(async () => {
        fullscreenButton(host).click();
      });

      await act(async () => {
        host.querySelector<HTMLButtonElement>("[data-open-dialog]")!.click();
      });

      const dialog = document.querySelector<HTMLElement>("[role='dialog']")!;
      const container = host.querySelector("[data-control-tower-shell]")!;

      expect(dialog).not.toBeNull();
      // Portalled out of the Torre, yet inside what the browser paints...
      expect(container.contains(dialog)).toBe(false);
      expect(browser.state.current!.contains(dialog)).toBe(true);
      // ...and stacked above the pinned Torre.
      expect(dialog.className).toContain("z-50");
      expect(container.className).toContain("z-40");
      // One toggle pattern: the name says it, no aria-pressed on top.
      expect(fullscreenButton(host).getAttribute("aria-label")).toBe(
        "Sair da tela cheia",
      );
      expect(fullscreenButton(host).hasAttribute("aria-pressed")).toBe(false);
    } finally {
      browser.restore();
    }
  });

  it("stays on when another view of the Torre mounts on the full screen", async () => {
    const browser = nativeFullscreen();

    try {
      // The page is already on full screen when the next view mounts.
      browser.state.current = document.documentElement;

      const host = await mount(shell({ view: "panel" }));

      expect(
        host.querySelector("[data-control-tower-shell]")!.className,
      ).toContain("fixed");
      expect(fullscreenButton(host).getAttribute("aria-label")).toBe(
        "Sair da tela cheia",
      );
    } finally {
      browser.restore();
    }
  });

  it("pins the Torre over the page where the API is missing, and Esc leaves", async () => {
    // iOS Safari on an iPhone: no Fullscreen API on elements.
    const undoEnabled = defineDocument("fullscreenEnabled", () => false);

    try {
      const host = await mount(shell());
      const container = host.querySelector("[data-control-tower-shell]")!;

      await act(async () => {
        fullscreenButton(host).click();
      });

      expect(container.className).toContain("fixed");
      expect(container.className).toContain("inset-0");
      // One toggle pattern: the name says it, no aria-pressed on top.
      expect(fullscreenButton(host).getAttribute("aria-label")).toBe(
        "Sair da tela cheia",
      );
      expect(fullscreenButton(host).hasAttribute("aria-pressed")).toBe(false);

      await act(async () => {
        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
      });

      expect(container.className).not.toContain("fixed");
      expect(fullscreenButton(host).getAttribute("aria-label")).toBe(
        "Tela cheia",
      );
    } finally {
      undoEnabled();
    }
  });
});
