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
 * The API as the server actions answer it; they run on the Next server.
 */
const api = vi.hoisted(() => ({
  status: "PENDING",
  types: [{ id: "t1", name: "Avaria", is_active: true }],
  reasons: [{ id: "r1", name: "Pedido do cliente", is_active: true }],
  deliveryCalls: 0,
  typeCalls: 0,
}));

vi.mock("@/actions/delivery/get-delivery", () => ({
  getDelivery: async (_businessId: string, id: string) => {
    api.deliveryCalls += 1;
    return { success: true, message: "", data: { id, status: api.status } };
  },
}));

vi.mock("@/actions/status-change-reason/list-status-change-reason", () => ({
  listStatusChangeReasons: async () => ({
    success: true,
    message: "",
    data: { data: [...api.reasons] },
  }),
}));

vi.mock("@/actions/occurrence-type/list-occurrence-type", () => ({
  listOccurrenceTypes: async () => {
    api.typeCalls += 1;
    return { success: true, message: "", data: { data: [...api.types] } };
  },
}));

import { queryClientProps } from "@/lib/query-client-props";
import { useDeliveryDetail } from "@/hooks/use-delivery-detail";
import { useOccurrenceTypes } from "@/hooks/use-occurrence-types";
import { useStatusReasons } from "@/app/(protected)/_components/shared/selectors/status-reason-selector/hooks";

/**
 * "Ver detalhes" of a delivery, reopened after another session changed
 * something (Entregas 2, 3; REV-3, REV-12, DLV-EDIT-3, DLV-OT-1).
 *
 * Both reads sat on the global five-minute `staleTime`: a status changed by a
 * colleague, or an occurrence type the MASTER just created, only showed after
 * five minutes or an F5 — Atualizar on the Entregas tab never reached them.
 */
const BUSINESS = "018f0000-0000-7000-8000-00000000000b";

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal("React", React);
});

beforeEach(() => {
  api.status = "PENDING";
  api.types = [{ id: "t1", name: "Avaria", is_active: true }];
  api.reasons = [{ id: "r1", name: "Pedido do cliente", is_active: true }];
  api.deliveryCalls = 0;
  api.typeCalls = 0;
});

afterEach(() => {
  vi.restoreAllMocks();
  queryClientProps.clear();
});

async function until(condition: () => boolean, ms = 2_000): Promise<boolean> {
  const deadline = performance.now() + ms;

  while (performance.now() < deadline) {
    if (condition()) return true;
    await act(async () => {
      await new Promise((done) => setTimeout(done, 20));
    });
  }

  return condition();
}

let status: string | undefined;
let typeNames: string[] = [];
let reasonNames: string[] = [];

/** What the dialog reads, mounted while it is open. */
const Dialog = () => {
  status = (
    useDeliveryDetail(BUSINESS, "delivery-1").data?.data as
      { status?: string } | undefined
  )?.status;
  typeNames = useOccurrenceTypes(BUSINESS).occurrenceTypes.map(
    (type) => type.name,
  );
  reasonNames = useStatusReasons(BUSINESS).reasons.map((reason) => reason.name);
  return null;
};

async function open(): Promise<() => Promise<void>> {
  const root = createRoot(document.createElement("div"));

  await act(async () => {
    root.render(
      createElement(
        QueryClientProvider,
        { client: queryClientProps },
        createElement(Dialog),
      ),
    );
  });

  return async () => act(async () => root.unmount());
}

describe("Ver detalhes, reopened", () => {
  it("shows the status another session set a moment ago", async () => {
    const close = await open();
    expect(await until(() => status === "PENDING")).toBe(true);
    await close();

    api.status = "IN_TRANSIT";

    const closeAgain = await open();

    expect(
      await until(() => status === "IN_TRANSIT"),
      "o detalhe reabriu com o status antigo",
    ).toBe(true);
    await closeAgain();
  });

  it("offers an occurrence type created since it was last opened", async () => {
    const close = await open();
    expect(await until(() => typeNames.join() === "Avaria")).toBe(true);
    await close();

    // The MASTER creates a type and retires the old one; the operator opens
    // another delivery's detail a little later.
    api.types = [
      { id: "t1", name: "Avaria", is_active: false },
      { id: "t2", name: "Cliente ausente", is_active: true },
    ];

    const later = Date.now() + 6_000;
    vi.spyOn(Date, "now").mockImplementation(() => later);

    const closeAgain = await open();

    expect(
      await until(() => typeNames.join() === "Cliente ausente"),
      "o tipo novo não apareceu ao registrar ocorrência",
    ).toBe(true);
    await closeAgain();
  });

  it("offers a status reason created in /admin since it was last opened", async () => {
    const close = await open();
    expect(await until(() => reasonNames.join() === "Pedido do cliente")).toBe(
      true,
    );
    await close();

    api.reasons = [
      { id: "r1", name: "Pedido do cliente", is_active: true },
      { id: "r2", name: "Endereço não localizado", is_active: true },
    ];

    const later = Date.now() + 6_000;
    vi.spyOn(Date, "now").mockImplementation(() => later);

    const closeAgain = await open();

    expect(
      await until(() => reasonNames.includes("Endereço não localizado")),
      "o motivo novo não apareceu no diálogo",
    ).toBe(true);
    await closeAgain();
  });
});
