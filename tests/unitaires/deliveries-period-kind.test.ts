import * as React from "react";
import { act, createElement, type ReactElement } from "react";
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
 * The deliveries list by period and by type (product meeting of 14/10/2026).
 *
 * The list read the company's whole history on every open — a carrier with
 * ~3,000 deliveries a day paged and counted months of rows to show today's.
 * It now opens on today, with Hoje / 7 / 14 / 30 dias / Personalizado (at
 * most 92 days, the API's cap), held in the URL, followed by the cards and
 * the export. And a record is an Entrega or an Ordem de serviço: the form
 * asks for it, the list shows it and filters by it.
 */
const navigation = vi.hoisted(() => ({
  search: "",
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: navigation.push,
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/dashboard/deliveries",
  useSearchParams: () => new URLSearchParams(navigation.search),
}));

vi.mock("react-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-dom")>()),
  useFormState: (_action: unknown, initial: unknown) => [initial, () => {}],
  useFormStatus: () => ({ pending: false }),
}));

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

vi.mock("@/actions/delivery/create-delivery", () => ({
  handleCreateDelivery: vi.fn(),
}));
vi.mock("@/actions/delivery/update-delivery", () => ({
  handleUpdateDelivery: vi.fn(),
}));
vi.mock("@/features/deliveries/deliveries/shipper-selector", () => ({
  ShipperSelector: () =>
    createElement("button", { type: "button", id: "shipper-selector" }),
}));

import {
  MAX_CUSTOM_PERIOD_DAYS,
  customRangeProblem,
  deliveryPeriodQuery,
  readDeliveryPeriod,
  writeDeliveryPeriod,
} from "@/features/deliveries/lib/period";
import {
  DELIVERY_TABLE,
  deliveriesListQuery,
} from "@/features/deliveries/deliveries/server-table";
import { deliveryTabListQuery } from "@/features/deliveries/lib/list-query";
import { exportRequestFor } from "@/features/deliveries/lib/export-action";
import { DeliveriesPeriodFilter } from "@/features/deliveries/table-toolbar/period-filter";
import { DeliveriesTableToolbar } from "@/features/deliveries/table-toolbar";
import { DeliveryFormDialog } from "@/features/deliveries/deliveries/form-dialog";
import { buildDeliveryColumns } from "@/features/deliveries/deliveries/table-columns";
import { createUpdateDeliverySchema } from "@/schemas/create-update-delivery-schema";
import { serverTableQuery } from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";

const BUSINESS = "018f0000-0000-7000-8000-00000000000b";

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal("React", React);
});

let root: Root | null = null;

beforeEach(() => {
  navigation.search = "";
  navigation.push.mockClear();
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

async function mount(element: ReactElement): Promise<void> {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  await act(async () =>
    root!.render(createElement(QueryClientProvider, { client }, element)),
  );
}

const button = (label: string) =>
  [...document.querySelectorAll("button")].find(
    (element) => (element.textContent ?? "").trim() === label,
  )!;

async function click(element: Element) {
  await act(async () => {
    (element as HTMLElement).click();
  });
}

async function type(element: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )!.set!;

  await act(async () => {
    setter.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

const pushedQuery = () =>
  new URLSearchParams(
    String(navigation.push.mock.calls.at(-1)?.[0] ?? "").replace(/^\?/, ""),
  );

describe("the period in the URL", () => {
  it("opens on today when the URL names none", () => {
    expect(readDeliveryPeriod({})).toEqual({ period: "today" });
    expect(readDeliveryPeriod({ period: "nunca" })).toEqual({
      period: "today",
    });

    // The API is always told: an absent period there means every date.
    expect(deliveryPeriodQuery({})).toEqual({ period: "today" });
  });

  it("reads a preset and a custom range", () => {
    expect(readDeliveryPeriod({ period: "14d" })).toEqual({ period: "14d" });
    expect(
      deliveryPeriodQuery({
        period: "custom",
        from: "2026-10-01",
        to: "2026-10-28",
      }),
    ).toEqual({ period: "custom", from: "2026-10-01", to: "2026-10-28" });
  });

  it("falls back to today on a custom range the API would refuse", () => {
    for (const range of [
      { from: "2026-10-28", to: "2026-10-01" },
      { from: "2026-01-01", to: "2026-12-31" },
      { from: "2026-02-30", to: "2026-03-01" },
      { from: "2026-10-01" },
    ]) {
      expect(
        deliveryPeriodQuery({ period: "custom", ...range }),
        JSON.stringify(range),
      ).toEqual({ period: "today" });
    }
  });

  it("writes a preset, leaves no trace for today, and goes back to page 1", () => {
    const current = new URLSearchParams(
      "page=4&status=PENDING&period=custom&from=2026-10-01&to=2026-10-02",
    );

    expect(writeDeliveryPeriod(current, { period: "7d" }).toString()).toBe(
      "status=PENDING&period=7d",
    );
    expect(writeDeliveryPeriod(current, { period: "today" }).toString()).toBe(
      "status=PENDING",
    );
    expect(
      writeDeliveryPeriod(new URLSearchParams("page=2"), {
        period: "custom",
        from: "2026-10-01",
        to: "2026-10-10",
      }).toString(),
    ).toBe("period=custom&from=2026-10-01&to=2026-10-10");
  });

  it("validates a custom range with the API's cap, in Portuguese", () => {
    expect(MAX_CUSTOM_PERIOD_DAYS).toBe(92);

    expect(customRangeProblem("2026-10-01", "2026-12-31")).toBeNull();
    expect(customRangeProblem("2026-10-01", "2027-01-01")).toBe(
      "O período personalizado pode ter no máximo 92 dias. Para um intervalo maior, exporte por partes.",
    );
    expect(customRangeProblem("2026-10-10", "2026-10-01")).toBe(
      "A data inicial do período não pode ser depois da data final.",
    );
    expect(customRangeProblem("", "2026-10-01")).toBe(
      "Informe a data inicial e a data final do período.",
    );
  });
});

describe("what goes to the API", () => {
  it("sends the period and the type with the list's own filters", () => {
    expect(deliveriesListQuery({ kind: "SERVICE_ORDER,BOGUS" })).toEqual({
      kind: "SERVICE_ORDER",
      period: "today",
    });
    expect(
      deliveryTabListQuery("deliveries", { period: "30d", status: "FAILED" }),
    ).toEqual({ status: "FAILED", period: "30d" });

    // The other tabs have no period.
    expect(deliveryTabListQuery("shippers", { period: "30d" })).toEqual({});
  });

  it("exports with the same period and type as the screen", () => {
    const request = exportRequestFor("deliveries", {
      businessId: BUSINESS,
      searchParams: new URLSearchParams(
        "period=custom&from=2026-10-01&to=2026-10-15&kind=SERVICE_ORDER",
      ),
    })("ana", "csv");

    const query = new URL(request.url, "http://localhost").searchParams;

    expect(query.get("period")).toBe("custom");
    expect(query.get("from")).toBe("2026-10-01");
    expect(query.get("to")).toBe("2026-10-15");
    expect(query.get("kind")).toBe("SERVICE_ORDER");
    expect(query.get("search")).toBe("ana");
    expect(query.get("businessId")).toBe(BUSINESS);
  });

  it("exports today's list when the screen shows today's", () => {
    const request = exportRequestFor("deliveries", {
      businessId: null,
      searchParams: new URLSearchParams(""),
    })(undefined, "excel");

    expect(
      new URL(request.url, "http://localhost").searchParams.get("period"),
    ).toBe("today");
  });
});

describe("the period presets in the toolbar", () => {
  it("marks Hoje by default and moves to a preset through the URL", async () => {
    navigation.search = "page=3&status=PENDING";

    await mount(createElement(DeliveriesPeriodFilter));

    expect(button("Hoje").getAttribute("aria-pressed")).toBe("true");

    await click(button("7 dias"));

    expect(navigation.push).toHaveBeenCalledTimes(1);
    expect(pushedQuery().get("period")).toBe("7d");
    expect(pushedQuery().get("status")).toBe("PENDING");
    expect(pushedQuery().get("page")).toBeNull();
  });

  it("refuses a range over 92 days in the popover, and applies a valid one", async () => {
    await mount(createElement(DeliveriesPeriodFilter));

    await click(button("Personalizado"));

    const from = document.querySelector<HTMLInputElement>(
      "#deliveries-period-from",
    )!;
    const to = document.querySelector<HTMLInputElement>(
      "#deliveries-period-to",
    )!;

    await type(from, "2026-01-01");
    await type(to, "2026-06-30");
    await click(button("Aplicar"));

    expect(document.querySelector("[role='alert']")?.textContent).toContain(
      "no máximo 92 dias",
    );
    expect(navigation.push).not.toHaveBeenCalled();

    await type(to, "2026-01-31");

    // Live: the message goes once the dates are right.
    expect(document.querySelector("[role='alert']")).toBeNull();

    await click(button("Aplicar"));

    expect(pushedQuery().toString()).toBe(
      "period=custom&from=2026-01-01&to=2026-01-31",
    );
  });

  it("says how a search treats the period", async () => {
    navigation.search = "search=ana&period=7d";

    await mount(createElement(DeliveriesPeriodFilter));

    expect(
      document.querySelector("[data-period-search-hint]")?.textContent,
    ).toContain("A busca procura no período escolhido");
  });

  it("stays usable when the list failed to load, so a shorter period gets out", async () => {
    // A 30-day read timed out on a busy tenant: the table hands the toolbar
    // its error, and Hoje must still be one click away.
    navigation.search = "period=30d";

    await mount(
      createElement(DeliveriesTableToolbar, {
        activeTab: "deliveries",
        error: true,
      }),
    );

    for (const label of [
      "Hoje",
      "7 dias",
      "14 dias",
      "30 dias",
      "Personalizado",
    ]) {
      expect(button(label).disabled).toBe(false);
    }

    await click(button("Hoje"));

    expect(navigation.push).toHaveBeenCalledTimes(1);
    expect(pushedQuery().get("period")).toBeNull();
  });

  it("says when an exact search made the API ignore the period", async () => {
    navigation.search = "search=018f0000&period=7d";

    await mount(
      createElement(DeliveriesPeriodFilter, {
        periodMeta: { from: "2026-10-22", to: "2026-10-28", applied: false },
      }),
    );

    expect(
      document.querySelector("[data-period-search-hint]")?.textContent,
    ).toContain("o período foi ignorado");
  });
});

describe("the type of a record", () => {
  const form = (delivery: unknown = null) =>
    createElement(DeliveryFormDialog, {
      businessId: BUSINESS,
      isOpen: true,
      onClose: () => {},
      delivery: delivery as never,
    });

  const kindInput = () =>
    document.querySelector<HTMLInputElement>("input[name='kind']");

  const detail = (kind?: string) => ({
    id: "e1",
    kind,
    code: null,
    invoice_key: null,
    invoice_number: null,
    recipient_name: "Padaria",
    recipient_document: null,
    recipient_email: null,
    recipient_telephone: null,
    cep: "01001000",
    city: "São Paulo",
    uf: "SP",
    street: "Praça da Sé",
    address_number: null,
    complement: null,
    neighborhood: null,
    notes: null,
    status: "PENDING",
    scheduled_date: null,
    delivered_at: null,
    shipper: { id: "s1", name: "Embarcador" },
    driver: null,
    vehicle: null,
    items: [],
    import: null,
    created_at: "2026-10-28T10:00:00.000Z",
    updated_at: "2026-10-28T10:00:00.000Z",
  });

  it("asks for the type on a new record, Entrega by default", async () => {
    await mount(form());

    expect(
      document.querySelector("label[for='delivery-kind']")?.textContent,
    ).toContain("Tipo");
    expect(kindInput()?.value).toBe("DELIVERY");
    expect(
      document.querySelector("[data-delivery-kind-trigger]")?.textContent,
    ).toBe("Entrega");
  });

  it("switches to Ordem de serviço", async () => {
    await mount(form());

    const trigger = document.querySelector<HTMLElement>(
      "[data-delivery-kind-trigger]",
    )!;

    await act(async () => {
      trigger.focus();
      trigger.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      );
    });

    const option = [...document.querySelectorAll("[role='option']")].find(
      (element) => element.textContent === "Ordem de serviço",
    ) as HTMLElement;

    expect(option).toBeTruthy();

    await act(async () => {
      option.focus();
      option.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      );
    });

    expect(kindInput()?.value).toBe("SERVICE_ORDER");
  });

  it("keeps the type of the record being edited", async () => {
    await mount(form(detail("SERVICE_ORDER")));

    expect(kindInput()?.value).toBe("SERVICE_ORDER");
  });

  it("shows a Coleta without offering to change it, and sends no type", async () => {
    await mount(form(detail("PICKUP")));

    expect(kindInput()).toBeNull();
    expect(
      document.querySelector("[data-delivery-kind-trigger]")?.textContent,
    ).toBe("Coleta");
    expect(
      document
        .querySelector("[data-delivery-kind-trigger]")
        ?.hasAttribute("disabled"),
    ).toBe(true);
  });

  it("writes only Entrega or Ordem de serviço", () => {
    const base = {
      shipperId: "s1",
      recipient_name: "Cliente",
      cep: "01001000",
      city: "São Paulo",
      uf: "SP",
      street: "Praça da Sé",
    };

    expect(
      createUpdateDeliverySchema.safeParse({ ...base, kind: "SERVICE_ORDER" })
        .success,
    ).toBe(true);

    const pickup = createUpdateDeliverySchema.safeParse({
      ...base,
      kind: "PICKUP",
    });

    expect(pickup.success).toBe(false);
    expect(pickup.error?.issues[0].message).toBe(
      "Escolha o tipo: Entrega ou Ordem de serviço.",
    );
  });

  it("filters the list by type on the server", () => {
    expect(DELIVERY_TABLE.facets.kind).toEqual({
      param: "kind",
      values: ["DELIVERY", "SERVICE_ORDER", "PICKUP"],
    });
    expect(serverTableQuery({ kind: "PICKUP" }, DELIVERY_TABLE)).toEqual({
      kind: "PICKUP",
    });

    // The filter's column exists, so the Tipo button can draw.
    expect(buildDeliveryColumns().some((column) => column.id === "kind")).toBe(
      true,
    );
  });
});
