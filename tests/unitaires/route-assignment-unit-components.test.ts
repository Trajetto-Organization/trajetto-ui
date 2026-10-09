import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "react-query";

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
 * The route as the unit of assignment on screen (decision 14.7):
 *
 * - "Adicionar à rota" from the deliveries table adds to an existing route,
 *   MOVES the ones on another route that has not left (one call, move-stops),
 *   refuses by name the ones on a route that left, and never releases;
 * - the picker of deliveries without a route sends the selection with the
 *   plan version the page read, and a stale plan reloads instead of erroring;
 * - the stop list moves with the buttons, asks before removing and only then
 *   saves.
 *
 * The real components with the server actions mocked at the module boundary.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

const BUSINESS = "018f0000-0000-7000-8000-00000000000b";

const calls = vi.hoisted(() => ({
  openStops: [] as Array<Record<string, unknown>>,
  moved: [] as unknown[][],
  added: [] as unknown[][],
  addAnswer: null as null | Record<string, unknown>,
  push: [] as string[],
  formProps: null as null | Record<string, unknown>,
  unrouted: [] as Array<Record<string, unknown>>,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: (url: string) => calls.push.push(url),
    refresh: () => {},
  }),
  usePathname: () => "/dashboard/deliveries",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("@/actions/revalidate", () => ({
  revalidateTagName: async () => undefined,
}));

vi.mock("@/actions/route/route-operations", () => ({
  listOpenStops: async () => ({
    success: true,
    message: "",
    data: calls.openStops,
  }),
  listOpenRoutes: async () => ({
    success: true,
    message: "",
    data: {
      total: 1,
      data: [
        {
          id: "r1",
          code: 12,
          name: "Zona Sul",
          status: "PLANNED",
          scheduled_date: "2026-10-06T00:00:00.000Z",
          destination: null,
          driver: { id: "d", name: "João" },
          vehicle: { id: "v", license_plate: "ABC1D23" },
          stopCount: 4,
        },
      ],
    },
  }),
  moveRouteStops: async (...args: unknown[]) => {
    calls.moved.push(args);
    return {
      success: true,
      message: "",
      data: {
        added: 2,
        alreadyOnRoute: [],
        moved: [],
        cancelledRoutes: [],
        planVersion: 1,
        stopIds: [],
      },
    };
  },
  addRouteStops: async (...args: unknown[]) => {
    calls.added.push(args);
    return (
      calls.addAnswer ?? {
        success: true,
        message: "",
        data: {
          added: (args[2] as string[]).length,
          alreadyOnRoute: [],
          planVersion: 5,
          stopIds: [],
        },
      }
    );
  },
  listUnroutedDeliveries: async (
    _businessId: string,
    query: Record<string, unknown>,
  ) => {
    calls.unrouted.push(query);

    return {
      success: true,
      message: "",
      data: {
        total: 2,
        facets: {
          city: [{ value: "Santos", count: 2 }],
          uf: [],
          kind: [],
          shipper: [{ value: "sh-1", count: 2, label: "Atacado Dois" }],
        },
        data: [
          {
            id: "u1",
            code: "NF-1",
            kind: "DELIVERY",
            invoice_number: null,
            recipient_name: "Maria",
            street: "Rua A",
            address_number: "1",
            neighborhood: null,
            city: "Santos",
            uf: "SP",
            scheduled_date: null,
            latitude: null,
            longitude: null,
            shipper: null,
          },
          {
            id: "u2",
            code: "NF-2",
            kind: "PICKUP",
            invoice_number: null,
            recipient_name: "José",
            street: "Rua B",
            address_number: null,
            neighborhood: null,
            city: "Santos",
            uf: "SP",
            scheduled_date: null,
            latitude: null,
            longitude: null,
            shipper: null,
          },
        ],
      },
    };
  },
}));

// The new-route form is its own suite (route-dialogs): here only what it is
// given and that it hands the created route back.
vi.mock("@/features/routes/form-dialog", () => ({
  RouteFormDialog: (props: Record<string, unknown>) => {
    calls.formProps = props;

    React.useEffect(() => {
      void (
        props.onCreated as (created: { id: string; code: number }) => void
      )?.({
        id: "new-route",
        code: 7,
      });
    }, []);

    return null;
  },
}));

import { AddToRouteDialog } from "@/features/routes/add-to-route-dialog";
import { AddDeliveriesSheet } from "@/features/routes/detail-page/add-deliveries-sheet";
import { RouteStopsBoard } from "@/features/routes/detail-page/route-stops-board";
import { createOwnPlanWrites } from "@/features/routes/lib/own-plan-writes";
import { useLeaveGuard } from "@/features/routes/detail-page/hooks/use-leave-guard";
import { UNSAVED_ORDER_MESSAGE } from "@/features/routes/lib/leave-guard";

import type { RouteDetail, RouteStop } from "@/actions/route/get-route";

beforeAll(() => {
  vi.stubGlobal("React", React);
});

let root: Root | null = null;

beforeEach(() => {
  calls.openStops = [];
  calls.moved = [];
  calls.added = [];
  calls.addAnswer = null;
  calls.push = [];
  calls.formProps = null;
  calls.unrouted = [];
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

async function settle(times = 6): Promise<void> {
  for (let index = 0; index < times; index += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

async function mount(element: React.ReactElement): Promise<void> {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  await act(async () => {
    root!.render(createElement(QueryClientProvider, { client }, element));
  });

  await settle();
}

const buttonNamed = (name: string | RegExp) =>
  [...document.querySelectorAll<HTMLButtonElement>("button")].find((node) =>
    typeof name === "string"
      ? node.textContent?.trim() === name
      : name.test(node.textContent?.trim() ?? ""),
  );

async function click(node: Element | undefined | null): Promise<void> {
  expect(node, "botão não encontrado").toBeTruthy();

  await act(async () => {
    (node as HTMLElement).click();
  });

  await settle();
}

const selection = [
  { id: "d1", code: "E-1", recipient_name: "Ana" },
  { id: "d2", code: "E-2", recipient_name: "Bia" },
];

describe("Adicionar à rota, from the deliveries table", () => {
  it("moves the ones on another route into the chosen route, in one call", async () => {
    // Red before: the table offered "Atribuir motorista", which created AND
    // released a route; there was no way to put a selection on a route.
    calls.openStops = [
      {
        deliveryId: "d2",
        stopId: "s",
        routeId: "r9",
        routeCode: 9,
        routeStatus: "RELEASED",
      },
    ];

    const onAdded = vi.fn();

    await mount(
      createElement(AddToRouteDialog, {
        businessId: BUSINESS,
        deliveries: selection,
        isOpen: true,
        onClose: () => {},
        onAdded,
      }),
    );

    expect(document.body.textContent).toContain(
      "1 já está na Rota 9 e será movida.",
    );

    await click(
      [...document.querySelectorAll('[role="radio"]')].find((node) =>
        node.textContent?.includes("Rota 12"),
      ),
    );

    await click(buttonNamed("Adicionar"));

    expect(calls.moved).toEqual([[BUSINESS, "r1", ["d1", "d2"]]]);
    expect(calls.added).toEqual([]);
    expect(onAdded).toHaveBeenCalledTimes(1);
  });

  it("refuses a delivery on a route that already left, by name", async () => {
    calls.openStops = [
      {
        deliveryId: "d1",
        stopId: "s",
        routeId: "r5",
        routeCode: 5,
        routeStatus: "IN_PROGRESS",
      },
    ];

    await mount(
      createElement(AddToRouteDialog, {
        businessId: BUSINESS,
        deliveries: selection,
        isOpen: true,
        onClose: () => {},
        onAdded: () => {},
      }),
    );

    expect(document.querySelector('[role="alert"]')?.textContent).toContain(
      "E-1 (Rota 5)",
    );

    await click(
      [...document.querySelectorAll('[role="radio"]')].find((node) =>
        node.textContent?.includes("Rota 12"),
      ),
    );

    expect(buttonNamed("Adicionar")?.disabled).toBe(true);
  });

  it("plans a new route born with the free deliveries, and does not release it", async () => {
    await mount(
      createElement(AddToRouteDialog, {
        businessId: BUSINESS,
        deliveries: selection,
        isOpen: true,
        onClose: () => {},
        onAdded: () => {},
      }),
    );

    await click(
      [...document.querySelectorAll('[role="radio"]')].find(
        (node) => node.textContent?.trim() === "Nova rota",
      ),
    );

    await click(buttonNamed("Planejar nova rota"));

    // Created with the deliveries (atomic on the API); nothing moved, and
    // nothing here calls the release.
    expect(calls.formProps?.deliveryIds).toEqual(["d1", "d2"]);
    expect(calls.moved).toEqual([]);
  });
});

describe("Adicionar à rota, switching to Nova rota (review r1)", () => {
  it("moves the deliveries of a route clicked before switching, instead of leaving them out", async () => {
    // Red before: the plan kept the clicked route as the target in "Nova
    // rota", so d2 (already on it) counted as "already here" — left out of
    // both the create and the move while the toast said success.
    calls.openStops = [
      {
        deliveryId: "d2",
        stopId: "s",
        routeId: "r1",
        routeCode: 12,
        routeStatus: "PLANNED",
      },
    ];

    await mount(
      createElement(AddToRouteDialog, {
        businessId: BUSINESS,
        deliveries: selection,
        isOpen: true,
        onClose: () => {},
        onAdded: () => {},
      }),
    );

    await click(
      [...document.querySelectorAll('[role="radio"]')].find((node) =>
        node.textContent?.includes("Rota 12"),
      ),
    );

    await click(
      [...document.querySelectorAll('[role="radio"]')].find(
        (node) => node.textContent?.trim() === "Nova rota",
      ),
    );

    await click(buttonNamed("Planejar nova rota"));

    // Created empty, then every selected delivery moved in one call.
    expect(calls.formProps?.deliveryIds).toBeUndefined();
    expect(calls.moved).toEqual([[BUSINESS, "new-route", ["d1", "d2"]]]);
  });
});

const route = (overrides: Partial<RouteDetail> = {}): RouteDetail =>
  ({
    id: "r1",
    code: 12,
    name: null,
    status: "PLANNED",
    scheduled_date: "2026-10-06T00:00:00.000Z",
    destination: null,
    planned_departure_at: null,
    planned_arrival_at: null,
    started_at: null,
    completed_at: null,
    cancellation_reason: null,
    driverId: "d",
    vehicleId: "v",
    driver: { id: "d", name: "João" },
    vehicle: { id: "v", license_plate: "ABC1D23" },
    stops: [],
    plan_version: 4,
    created_at: "2026-10-05T12:00:00.000Z",
    updated_at: "2026-10-05T12:00:00.000Z",
    ...overrides,
  }) as RouteDetail;

describe("the picker of deliveries without a route", () => {
  it("adds the checked ones with the plan version the page read", async () => {
    const onAdded = vi.fn(async () => {});

    await mount(
      createElement(AddDeliveriesSheet, {
        businessId: BUSINESS,
        route: route(),
        open: true,
        onOpenChange: () => {},
        trackWrite: createOwnPlanWrites(() => {}).track,
        onConflict: async () => {},
        onAdded,
      }),
    );

    expect(document.body.textContent).toContain("2 sem rota");

    await click(
      document.querySelector('[aria-label="Selecionar NF-1 · Maria"]'),
    );
    await click(
      document.querySelector('[aria-label="Selecionar NF-2 · José"]'),
    );
    await click(buttonNamed("Adicionar (2)"));

    expect(calls.added).toEqual([[BUSINESS, "r1", ["u1", "u2"], 4]]);
    expect(onAdded).toHaveBeenCalledTimes(1);
  });

  it("reloads the route when a colleague changed the plan", async () => {
    calls.addAnswer = {
      success: false,
      message: "Outra pessoa alterou esta rota.",
      code: "ROUTE_PLAN_STALE",
    };

    const onConflict = vi.fn(async () => {});

    await mount(
      createElement(AddDeliveriesSheet, {
        businessId: BUSINESS,
        route: route(),
        open: true,
        onOpenChange: () => {},
        trackWrite: createOwnPlanWrites(() => {}).track,
        onConflict,
        onAdded: async () => {},
      }),
    );

    await click(
      document.querySelector('[aria-label="Selecionar NF-1 · Maria"]'),
    );
    await click(buttonNamed("Adicionar (1)"));

    expect(onConflict).toHaveBeenCalledWith("Outra pessoa alterou esta rota.");
  });
});

describe("the picker's shipper filter (review r1)", () => {
  it("offers the shippers by name and asks the server for the chosen one", async () => {
    // Red before: there was no shipper filter, although the API took one.
    await mount(
      createElement(AddDeliveriesSheet, {
        businessId: BUSINESS,
        route: route(),
        open: true,
        onOpenChange: () => {},
        trackWrite: createOwnPlanWrites(() => {}).track,
        onConflict: async () => {},
        onAdded: async () => {},
      }),
    );

    await click(buttonNamed("Atacado Dois (2)"));
    await settle(10);

    expect(calls.unrouted.at(-1)).toMatchObject({ shipperIds: ["sh-1"] });
  });
});

describe("the stop list", () => {
  const stop = (id: string, title: string): RouteStop =>
    ({
      id,
      sequence: 10,
      status: "PENDING",
      arrived_at: null,
      completed_at: null,
      routeId: "r1",
      deliveryId: `del-${id}`,
      delivery: {
        id: `del-${id}`,
        kind: "DELIVERY",
        status: "PENDING",
        recipient_name: title,
        city: "Santos",
        uf: "SP",
        street: "Rua",
        address_number: null,
        neighborhood: null,
        latitude: null,
        longitude: null,
      },
    }) as RouteStop;

  const board = (overrides: Record<string, unknown> = {}) => {
    const handlers = {
      onMove: vi.fn(),
      onSave: vi.fn(),
      onDiscard: vi.fn(),
      onRemove: vi.fn(async () => true),
      onOpenPicker: vi.fn(),
      onPin: vi.fn(),
      onHighlight: vi.fn(),
    };

    const element = createElement(RouteStopsBoard, {
      stops: [stop("s1", "Maria"), stop("s2", "José")],
      orderedIds: ["s1", "s2"],
      dirty: false,
      editable: true,
      blockedReason: null,
      addBlockedReason: null,
      released: true,
      isSaving: false,
      isRemoving: false,
      highlightedStopId: null,
      ...handlers,
      ...overrides,
    });

    return { element, handlers };
  };

  it("moves a stop with the buttons and saves only when asked", async () => {
    const { element, handlers } = board({ dirty: true });

    await mount(element);

    await click(document.querySelector('[aria-label="Descer Maria"]'));

    expect(handlers.onMove).toHaveBeenCalledWith(0, 1);
    expect(
      (
        document.querySelector(
          '[aria-label="Subir Maria"]',
        ) as HTMLButtonElement
      ).disabled,
    ).toBe(true);

    await click(buttonNamed("Salvar ordem"));

    expect(handlers.onSave).toHaveBeenCalledTimes(1);
  });

  it("asks before removing, and says the driver will be told on a released route", async () => {
    const { element, handlers } = board();

    await mount(element);

    await click(document.querySelector('[aria-label="Selecionar Maria"]'));
    await click(buttonNamed("Remover da rota (1)"));

    expect(document.body.textContent).toContain("O motorista será avisado");
    expect(handlers.onRemove).not.toHaveBeenCalled();

    await click(buttonNamed("Remover"));

    expect(handlers.onRemove).toHaveBeenCalledWith(["s1"]);
  });

  it("is read-only on a route that left, saying why", async () => {
    const { element } = board({
      editable: false,
      blockedReason: "A ordem das paradas é o que o motorista está seguindo.",
    });

    await mount(element);

    expect(document.querySelector('[aria-label^="Arrastar"]')).toBeNull();
    expect(document.querySelector('[aria-label="Descer Maria"]')).toBeNull();
    expect(document.body.textContent).toContain(
      "A ordem das paradas é o que o motorista está seguindo.",
    );
  });
});

describe("leaving with an unsaved order (review r1)", () => {
  const Guarded = ({
    dirty,
    onLink,
  }: {
    dirty: boolean;
    onLink: () => void;
  }) => {
    useLeaveGuard(dirty, UNSAVED_ORDER_MESSAGE);

    // Stands in for Next's Link: a React onClick on the anchor.
    return createElement(
      "a",
      {
        href: "/dashboard/routes?businessId=b",
        onClick: (event: React.MouseEvent) => {
          event.preventDefault();
          onLink();
        },
      },
      "Voltar",
    );
  };

  it("asks before a link leaves the page, and stays when the dispatcher declines", async () => {
    // Red before: nothing guarded the page; the Link navigated and the
    // dragged order was gone.
    const onLink = vi.fn();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);

    await mount(createElement(Guarded, { dirty: true, onLink }));
    await click(document.querySelector("a"));

    expect(confirm).toHaveBeenCalledWith(UNSAVED_ORDER_MESSAGE);
    expect(onLink).not.toHaveBeenCalled();

    confirm.mockReturnValue(true);
    await click(document.querySelector("a"));

    expect(onLink).toHaveBeenCalledTimes(1);
    confirm.mockRestore();
  });

  it("does not ask when there is nothing unsaved", async () => {
    const onLink = vi.fn();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);

    await mount(createElement(Guarded, { dirty: false, onLink }));
    await click(document.querySelector("a"));

    expect(confirm).not.toHaveBeenCalled();
    expect(onLink).toHaveBeenCalledTimes(1);
    confirm.mockRestore();
  });
});
