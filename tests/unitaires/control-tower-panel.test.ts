import * as React from "react";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "react-query";

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
 * The tower's panel against the server action and the socket, rendered.
 *
 * Each case is a defect of the old panel: a refused read blanked the map and
 * left the widgets as skeletons forever (UI-TWR-1), a five-minute-old point
 * arriving over the socket was drawn as fresh (UI-TWR-4), a route event did
 * nothing until the next 30-second poll, and a master switching company kept
 * the previous company's selected driver (UI-TWR-8).
 */
const router = vi.hoisted(() => ({
  refresh: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
}));

const params = vi.hoisted(() => ({ current: new URLSearchParams() }));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/admin/control-tower",
  useSearchParams: () => params.current,
}));

// Leaflet needs a real browser. The stub draws what the map would: one
// button per dot, carrying its state.
vi.mock("next/dynamic", () => ({
  default: () =>
    function TowerMapStub(props: {
      positions: Array<{
        driverId: string;
        driverName: string;
        state: string;
        latitude: number;
      }>;
      onSelectDriver: (driverId: string) => void;
    }) {
      return createElement(
        "div",
        null,
        props.positions.map((position) =>
          createElement(
            "button",
            {
              key: position.driverId,
              type: "button",
              "data-state": position.state,
              "data-latitude": String(position.latitude),
              onClick: () => props.onSelectDriver(position.driverId),
            },
            `Selecionar ${position.driverName}`,
          ),
        ),
      );
    },
}));

vi.mock("@/app/(protected)/_components/shared/business-selector", () => ({
  BusinessSelector: () => null,
}));

/** A socket the test can speak through. */
const socket = vi.hoisted(() => {
  const handlers = new Map<string, Set<(payload: unknown) => void>>();

  return {
    connected: true,
    on(event: string, handler: (payload: unknown) => void) {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)!.add(handler);
    },
    off(event: string, handler: (payload: unknown) => void) {
      handlers.get(event)?.delete(handler);
    },
    emit: () => undefined,
    fire(event: string, payload: unknown) {
      for (const handler of handlers.get(event) ?? []) handler(payload);
    },
    reset() {
      handlers.clear();
    },
  };
});

const resync = vi.hoisted(() => new Set<() => void>());

vi.mock("@/socket", () => ({
  initializeSocket: async () => socket,
  getSocket: () => socket,
  onRealtimeResync: (listener: () => void) => {
    resync.add(listener);

    return () => {
      resync.delete(listener);
    };
  },
}));

const BUSINESS_A = "018f0000-0000-7000-8000-00000000000a";
const BUSINESS_B = "018f0000-0000-7000-8000-00000000000b";

type Answer = {
  success: boolean;
  message: string;
  data?: unknown;
  code?: string;
  status?: number;
};

const api = vi.hoisted(() => ({
  towerAnswers: [] as Array<() => Answer | Promise<Answer>>,
  towerCalls: [] as Array<string | undefined>,
  trailCalls: [] as Array<{ driverId: string; businessId?: string }>,
}));

function tower(positions: unknown[] = []) {
  return {
    day: "2026-09-28",
    timeZone: "America/Sao_Paulo",
    positions,
    activeRoutes: [],
    funnel: [],
    progress: { finished: 0, total: 0, rate: null },
    punctuality: {
      onTime: 0,
      late: 0,
      notDeparted: 0,
      waiting: 0,
      notPlanned: 0,
      rate: null,
    },
    events: [],
  };
}

const ANA = (recordedAt = new Date().toISOString()) => ({
  driverId: "d1",
  driverName: "Ana",
  routeId: "r1",
  routeCode: 7,
  routeStatus: "IN_PROGRESS",
  vehiclePlate: "ABC1D23",
  latitude: -18.9,
  longitude: -48.2,
  speed: null,
  heading: null,
  battery: null,
  recordedAt,
  fresh: true,
  state: "moving",
  endedAt: null,
});

vi.mock("@/actions/control-tower", () => ({
  getControlTower: async (businessId?: string) => {
    api.towerCalls.push(businessId);

    const next =
      api.towerAnswers.length > 1
        ? api.towerAnswers.shift()!
        : api.towerAnswers[0];

    return next();
  },
  getDriverTrail: async (
    driverId: string,
    options: { businessId?: string },
  ) => {
    api.trailCalls.push({ driverId, businessId: options.businessId });

    return {
      success: true,
      message: "",
      data: { driverId, day: "2026-09-28", recorded: 3, points: [] },
    };
  },
}));

// The authorization queue mounted on the tower (decision 6.3) reads through a
// server action; unmocked, it reaches `cookies()` outside a request. Nothing
// waits here: the queue hides itself, as it does on a quiet operation.
vi.mock("@/actions/delivery/occurrence-authorizations", () => ({
  listPendingAuthorizations: async (businessId?: string) => ({
    success: true,
    message: "",
    data: { data: [], total: 0, businessId: businessId ?? "biz-1" },
  }),
  decideOccurrenceAuthorization: async () => ({ success: false, message: "" }),
}));

import { queryClientProps } from "@/lib/query-client-props";
import { useAuthStore } from "@/store/auth-store";
import { ControlTowerPanel } from "@/features/control-tower/panel";
import { ControlTowerContent } from "@/features/control-tower/content";
import {
  FOREGROUND_ONLY_NOTICE,
  isBackgroundTrackingOn,
} from "@/features/control-tower/lib/tracking-notice";
import AdminControlTowerLoading from "@/app/(protected)/admin/control-tower/loading";

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal("React", React);
});

beforeEach(() => {
  api.towerAnswers = [];
  api.towerCalls = [];
  api.trailCalls = [];
  socket.reset();
  resync.clear();
  params.current = new URLSearchParams();
  localStorage.clear();
  useAuthStore.setState({ businessId: null });
});

const unmounts: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (unmounts.length) await unmounts.pop()!();
  queryClientProps.clear();
});

async function until(condition: () => boolean, ms = 4_000): Promise<boolean> {
  const deadline = performance.now() + ms;

  while (performance.now() < deadline) {
    if (condition()) return true;
    await act(async () => {
      await new Promise((done) => setTimeout(done, 20));
    });
  }

  return condition();
}

async function render(element: React.ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);

  const root = createRoot(container);

  const draw = async (next: React.ReactElement) =>
    act(async () => {
      root.render(
        createElement(QueryClientProvider, { client: queryClientProps }, next),
      );
    });

  await draw(element);

  unmounts.push(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  return { container, draw };
}

const text = (container: HTMLElement) => container.textContent ?? "";

describe("a refused read (UI-TWR-1)", () => {
  it("says why instead of drawing an empty tower", async () => {
    api.towerAnswers = [
      () => ({
        success: false,
        message: "Módulo não habilitado",
        code: "MODULE_NOT_ENABLED",
        status: 403,
      }),
    ];

    const { container } = await render(
      createElement(ControlTowerPanel, { businessId: BUSINESS_A }),
    );

    expect(
      await until(() =>
        text(container).includes("Módulo Entregas não contratado"),
      ),
    ).toBe(true);

    // The shared refusal state (decision 4.1): the company user is told who
    // can hire it; asking again cannot, so there is no retry here.
    expect(text(container)).toContain("Fale com o suporte para contratar");

    // A permanent refusal is not retried behind the person's back.
    expect(api.towerCalls).toHaveLength(1);
  });

  it("gives the MASTER the way to enable the module, like the other screens (TWR-11)", async () => {
    api.towerAnswers = [
      () => ({
        success: false,
        message: "O módulo Entregas não está habilitado para esta empresa.",
        code: "MODULE_NOT_ENABLED",
        status: 403,
      }),
    ];

    const { container } = await render(
      createElement(ControlTowerPanel, {
        businessId: BUSINESS_A,
        mode: "admin",
      }),
    );

    expect(
      await until(() =>
        text(container).includes("Módulo Entregas não contratado"),
      ),
    ).toBe(true);
    expect(text(container)).toContain("Gerenciar módulos");
    expect(text(container)).toContain("Habilite-o em Módulos Contratados");
  });

  it("says a missing permission is the profile's, not the plan's (decision 4.1)", async () => {
    api.towerAnswers = [
      () => ({
        success: false,
        message: "Seu perfil de acesso não inclui esta seção.",
        code: "PERMISSION_DENIED",
        status: 403,
      }),
    ];

    const { container } = await render(
      createElement(ControlTowerPanel, { businessId: BUSINESS_A }),
    );

    expect(
      await until(() =>
        text(container).includes("Sem permissão para esta seção"),
      ),
    ).toBe(true);
    expect(text(container)).not.toContain("não contratado");
    expect(text(container)).not.toContain("Gerenciar módulos");
  });

  it("keeps the last good tower on screen when a poll fails", async () => {
    api.towerAnswers = [
      () => ({ success: true, message: "", data: tower([ANA()]) }),
      () => ({ success: false, message: "Erro interno", status: 500 }),
    ];

    const { container } = await render(
      createElement(ControlTowerPanel, { businessId: BUSINESS_A }),
    );

    expect(await until(() => text(container).includes("Selecionar Ana"))).toBe(
      true,
    );

    await act(async () => {
      await queryClientProps.refetchQueries(["control_tower", BUSINESS_A]);
    });

    expect(
      await until(() => text(container).includes("Mostrando os dados das")),
    ).toBe(true);

    // The truck is still there.
    expect(text(container)).toContain("Selecionar Ana");
    expect(text(container)).toContain("1 veículo em rota");
  });
});

describe("a point from the socket (UI-TWR-4)", () => {
  const minutesAgo = (minutes: number) =>
    new Date(Date.now() - minutes * 60_000).toISOString();

  const quietAna = () => ({
    ...ANA(minutesAgo(40)),
    fresh: false,
    state: "silent",
  });

  const point = (recordedAt: string) => ({
    driverId: "d1",
    routeId: "r1",
    latitude: -18.95,
    longitude: -48.25,
    speed: null,
    heading: null,
    recordedAt,
  });

  it("stays grey when the newest point of a backlog is old", async () => {
    api.towerAnswers = [
      () => ({ success: true, message: "", data: tower([quietAna()]) }),
    ];

    const { container } = await render(
      createElement(ControlTowerPanel, { businessId: BUSINESS_A }),
    );

    expect(
      await until(() =>
        text(container).includes("1 sem reportar há mais de 10 min"),
      ),
    ).toBe(true);

    // A phone out of a dead zone announces its newest point: 30 minutes old.
    // It used to be drawn as fresh because it had "just arrived".
    await act(async () => {
      socket.fire("driverPosition", point(minutesAgo(30)));
    });

    await act(async () => {
      await new Promise((done) => setTimeout(done, 50));
    });

    expect(text(container)).toContain("1 sem reportar há mais de 10 min");
    expect(
      container.querySelector("button[data-state]")?.getAttribute("data-state"),
    ).toBe("silent");
  });

  it("turns live again with a point recorded now", async () => {
    api.towerAnswers = [
      () => ({ success: true, message: "", data: tower([quietAna()]) }),
    ];

    const { container } = await render(
      createElement(ControlTowerPanel, { businessId: BUSINESS_A }),
    );

    expect(await until(() => text(container).includes("1 sem reportar"))).toBe(
      true,
    );

    await act(async () => {
      socket.fire("driverPosition", point(minutesAgo(0)));
    });

    expect(await until(() => !text(container).includes("sem reportar"))).toBe(
      true,
    );
    expect(
      container.querySelector("button[data-state]")?.getAttribute("data-state"),
    ).toBe("moving");
  });
});

/**
 * A read in flight when a point arrives. Every read used to clear the
 * socket's dots, so the read's older snapshot replaced the point received
 * meanwhile and the truck jumped back until its next ping.
 */
describe("a point that arrives during a reread", () => {
  it("keeps the truck where the newer point put it", async () => {
    const recorded = new Date(Date.now() - 20_000).toISOString();

    let answerReread: (answer: Answer) => void = () => undefined;

    api.towerAnswers = [
      () => ({ success: true, message: "", data: tower([ANA(recorded)]) }),
      () =>
        new Promise<Answer>((resolve) => {
          answerReread = resolve;
        }),
    ];

    const { container } = await render(
      createElement(ControlTowerPanel, { businessId: BUSINESS_A }),
    );

    const latitude = () =>
      container
        .querySelector("button[data-latitude]")
        ?.getAttribute("data-latitude");

    expect(await until(() => latitude() === "-18.9")).toBe(true);

    // A reconnection asks for the tower again; the read hangs.
    await act(async () => {
      [...resync].forEach((listener) => listener());
    });

    expect(await until(() => api.towerCalls.length === 2)).toBe(true);

    // Meanwhile the phone reports from further down the road.
    await act(async () => {
      socket.fire("driverPosition", {
        driverId: "d1",
        routeId: "r1",
        latitude: -18.99,
        longitude: -48.2,
        speed: null,
        heading: null,
        recordedAt: new Date().toISOString(),
      });
    });

    expect(await until(() => latitude() === "-18.99")).toBe(true);

    // The read lands with the snapshot taken before that point (another
    // battery reading, so it is a new answer and not the same one shared).
    await act(async () => {
      answerReread({
        success: true,
        message: "",
        data: tower([{ ...ANA(recorded), battery: 80 }]),
      });
    });

    await act(async () => {
      await new Promise((done) => setTimeout(done, 50));
    });

    expect(latitude(), "o caminhão voltou para o ponto antigo").toBe("-18.99");
  }, 10_000);
});

describe("a route event", () => {
  it("refreshes the numbers at once, not at the next poll", async () => {
    api.towerAnswers = [
      () => ({ success: true, message: "", data: tower([ANA()]) }),
    ];

    const { container } = await render(
      createElement(ControlTowerPanel, { businessId: BUSINESS_A }),
    );

    expect(await until(() => text(container).includes("Selecionar Ana"))).toBe(
      true,
    );

    const before = api.towerCalls.length;

    await act(async () => {
      socket.fire("routeEvent", { type: "route-stop.settled", routeId: "r1" });
    });

    expect(await until(() => api.towerCalls.length > before)).toBe(true);
  });
});

describe("a busy operation", () => {
  it("does not reread the tower for every stop that settles", async () => {
    api.towerAnswers = [
      () => ({ success: true, message: "", data: tower([ANA()]) }),
    ];

    const { container } = await render(
      createElement(ControlTowerPanel, { businessId: BUSINESS_A }),
    );

    expect(await until(() => text(container).includes("Selecionar Ana"))).toBe(
      true,
    );

    const before = api.towerCalls.length;

    await act(async () => {
      socket.fire("routeEvent", { type: "route-stop.settled", routeId: "r1" });
    });

    expect(await until(() => api.towerCalls.length === before + 1)).toBe(true);

    // Another stop two seconds later: it waits for the ten-second gap
    // instead of a read of its own 1.5 s after it.
    await act(async () => {
      socket.fire("routeEvent", { type: "route-stop.settled", routeId: "r1" });
    });

    await act(async () => {
      await new Promise((done) => setTimeout(done, 3_000));
    });

    expect(api.towerCalls.length).toBe(before + 1);
  }, 15_000);
});

describe("a driver the last read did not know (UI-TWR-4)", () => {
  it("reads the tower again, so the new truck gets its name and plate", async () => {
    api.towerAnswers = [
      () => ({ success: true, message: "", data: tower([ANA()]) }),
    ];

    const { container } = await render(
      createElement(ControlTowerPanel, { businessId: BUSINESS_A }),
    );

    expect(await until(() => text(container).includes("Selecionar Ana"))).toBe(
      true,
    );

    const before = api.towerCalls.length;

    // Bruno started a route after the last read: only the socket knows him.
    await act(async () => {
      socket.fire("driverPosition", {
        driverId: "d2",
        routeId: "r2",
        latitude: -18.8,
        longitude: -48.1,
        speed: null,
        heading: null,
        recordedAt: new Date().toISOString(),
      });
    });

    expect(await until(() => api.towerCalls.length > before)).toBe(true);
  });
});

describe("one clock on the screen (review of TWR-7)", () => {
  it("says when a route ended on the company's clock, like the feed", async () => {
    const rioBranco = {
      ...tower([
        {
          ...ANA(),
          fresh: false,
          state: "ended",
          routeStatus: "COMPLETED",
          // 10:00 in Rio Branco, 12:00 in São Paulo, 15:00 UTC.
          endedAt: "2026-09-28T15:00:00.000Z",
        },
      ]),
      timeZone: "America/Rio_Branco",
    };

    api.towerAnswers = [
      () => ({ success: true, message: "", data: rioBranco }),
    ];

    const { container } = await render(
      createElement(ControlTowerPanel, { businessId: BUSINESS_A }),
    );

    expect(await until(() => text(container).includes("Selecionar Ana"))).toBe(
      true,
    );

    // The runner is not in Rio Branco: the screen says whose clock it uses.
    expect(text(container)).toContain(
      "Horários no fuso da empresa (Rio Branco)",
    );

    await act(async () => {
      [...container.querySelectorAll("button")]
        .find((button) => button.textContent === "Selecionar Ana")!
        .click();
    });

    expect(
      await until(() => text(container).includes("concluída às 10:00")),
    ).toBe(true);
  });
});

describe("a reconnection", () => {
  it("reads the tower again: the socket has no replay", async () => {
    api.towerAnswers = [
      () => ({ success: true, message: "", data: tower([ANA()]) }),
    ];

    const { container } = await render(
      createElement(ControlTowerPanel, { businessId: BUSINESS_A }),
    );

    expect(await until(() => text(container).includes("Selecionar Ana"))).toBe(
      true,
    );

    const before = api.towerCalls.length;

    await act(async () => {
      for (const listener of resync) listener();
    });

    expect(await until(() => api.towerCalls.length > before)).toBe(true);
  });
});

describe("the loading state (UI-TWR-6)", () => {
  it("has the tower's shape, not a table's", async () => {
    const { container } = await render(createElement(AdminControlTowerLoading));

    expect(
      container.querySelector("[aria-label='Carregando a torre de controle']"),
    ).toBeTruthy();

    // The table skeleton drew ten rows of five cells.
    expect(
      container.querySelectorAll(".rounded-md.border .border-b").length,
    ).toBe(0);
  });
});

describe("switching company (UI-TWR-8)", () => {
  it("does not carry the selected driver to the next company", async () => {
    api.towerAnswers = [
      () => ({ success: true, message: "", data: tower([ANA()]) }),
    ];

    params.current = new URLSearchParams({ businessId: BUSINESS_A });

    const content = () =>
      createElement(ControlTowerContent, {
        mode: "admin",
        searchParams: {
          businessId: params.current.get("businessId") ?? undefined,
        },
        tiles: null,
      });

    const { container, draw } = await render(content());

    expect(await until(() => text(container).includes("Selecionar Ana"))).toBe(
      true,
    );

    await act(async () => {
      [...container.querySelectorAll("button")]
        .find((button) => button.textContent === "Selecionar Ana")!
        .click();
    });

    expect(await until(() => api.trailCalls.length === 1)).toBe(true);

    params.current = new URLSearchParams({ businessId: BUSINESS_B });

    await draw(content());

    expect(await until(() => api.towerCalls.includes(BUSINESS_B))).toBe(true);

    await act(async () => {
      await new Promise((done) => setTimeout(done, 200));
    });

    // Company A's driver was never asked for under company B.
    expect(
      api.trailCalls.filter((call) => call.businessId === BUSINESS_B),
    ).toEqual([]);
    expect(text(container)).not.toContain("pontos hoje");
  });
});

describe("what the tower can see of a driver (decision 7.3)", () => {
  it("says, on the screen, that a driver shows up only with the app open", async () => {
    api.towerAnswers = [
      () => ({ success: true, message: "", data: tower([ANA()]) }),
    ];

    const { container } = await render(
      createElement(ControlTowerPanel, { businessId: BUSINESS_A }),
    );

    expect(await until(() => text(container).includes("Selecionar Ana"))).toBe(
      true,
    );

    const note = container.querySelector("[role='note']");

    expect(note?.textContent).toBe(FOREGROUND_ONLY_NOTICE);
    expect(note?.textContent).toContain("só com o aplicativo aberto");
  });

  it("drops the note once the app reports from the background", async () => {
    api.towerAnswers = [
      () => ({ success: true, message: "", data: tower([ANA()]) }),
    ];

    const { container } = await render(
      createElement(ControlTowerPanel, {
        businessId: BUSINESS_A,
        backgroundTracking: true,
      }),
    );

    expect(await until(() => text(container).includes("Selecionar Ana"))).toBe(
      true,
    );
    expect(text(container)).not.toContain("só com o aplicativo aberto");
  });

  it("reads the switch the way the app reads EXPO_PUBLIC_BACKGROUND_TRACKING", () => {
    expect(isBackgroundTrackingOn("true")).toBe(true);
    expect(isBackgroundTrackingOn(" true ")).toBe(true);

    for (const off of [undefined, null, "", "false", "1", "TRUE", "yes"]) {
      expect(isBackgroundTrackingOn(off), String(off)).toBe(false);
    }
  });
});

describe("the company on /dashboard (UI-TWR-8)", () => {
  it("is the session's, whatever a copied admin link says", async () => {
    api.towerAnswers = [
      () => ({ success: true, message: "", data: tower([ANA()]) }),
    ];

    useAuthStore.setState({ businessId: BUSINESS_A });
    params.current = new URLSearchParams({ businessId: BUSINESS_B });

    const { container } = await render(
      createElement(ControlTowerContent, {
        mode: "dashboard",
        searchParams: { businessId: BUSINESS_B },
        tiles: null,
      }),
    );

    expect(await until(() => text(container).includes("Selecionar Ana"))).toBe(
      true,
    );

    // It used to ask for B and draw 403 "sem permissão" over the user's
    // own company.
    expect(api.towerCalls).not.toContain(BUSINESS_B);
    expect(api.towerCalls[0]).toBe(BUSINESS_A);
  });

  it("still lets the MASTER pick it on /admin", async () => {
    api.towerAnswers = [
      () => ({ success: true, message: "", data: tower([ANA()]) }),
    ];

    params.current = new URLSearchParams({ businessId: BUSINESS_B });

    await render(
      createElement(ControlTowerContent, {
        mode: "admin",
        searchParams: { businessId: BUSINESS_B },
        tiles: null,
      }),
    );

    expect(await until(() => api.towerCalls.length > 0)).toBe(true);
    expect(api.towerCalls[0]).toBe(BUSINESS_B);
  });
});
