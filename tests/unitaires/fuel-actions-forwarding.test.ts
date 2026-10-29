import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/actions/cookies", () => ({ getCookies: async () => "token" }));

import { handleExportFuel } from "@/actions/fuel/export-fuel";
import { handleUpdateFuel } from "@/actions/fuel/update-fuel";

/**
 * What the fuel server actions put on the wire.
 *
 * - The export carries the company the MASTER selected and the screen's
 *   facets (decision 5.8); the admin export used to send neither, so the
 *   API answered for no company at all. Being an endpoint, the action drops
 *   anything else.
 * - The edit carries only the links the dialog says changed (FLEET-FUEL-1):
 *   an absent link stays as it is on the server.
 */
const A = "018f0000-0000-7000-8000-00000000000a";
const BRANCH = "018f0000-0000-7000-8000-0000000000b1";
const VEHICLE = "018f0000-0000-7000-8000-0000000000c1";

const calls: Array<{ url: URL; init?: RequestInit }> = [];

beforeEach(() => {
  process.env.HTTP_REQUEST = "http://api.test";
  calls.length = 0;

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      calls.push({ url: new URL(String(input)), init });

      return {
        ok: true,
        status: 200,
        headers: new Headers({
          "content-disposition": 'attachment; filename="relatorio.csv"',
          "content-type": "text/csv",
        }),
        arrayBuffer: async () => new ArrayBuffer(4),
        json: async () => ({
          message: "Abastecimento atualizado com sucesso!",
        }),
      };
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("handleExportFuel", () => {
  it("forwards the selected company and the facets with the search", async () => {
    await handleExportFuel("placa", "excel", {
      businessId: A,
      branchId: BRANCH,
      vehicleId: `${VEHICLE},${VEHICLE}`,
    });

    const { url } = calls[0];

    expect(url.pathname).toBe("/fuel/export-fuel");
    expect(url.searchParams.get("search")).toBe("placa");
    expect(url.searchParams.get("format")).toBe("excel");
    expect(url.searchParams.get("businessId")).toBe(A);
    expect(url.searchParams.get("branchId")).toBe(BRANCH);
    expect(url.searchParams.get("vehicleId")).toBe(`${VEHICLE},${VEHICLE}`);
  });

  it("drops params it does not know and values that are not ids", async () => {
    await handleExportFuel(undefined, "csv", {
      businessId: "../../admin",
      fuelTypeId: "1 OR 1=1",
      injected: A,
    });

    const { url } = calls[0];

    expect(url.searchParams.has("businessId")).toBe(false);
    expect(url.searchParams.has("fuelTypeId")).toBe(false);
    expect(url.searchParams.has("injected")).toBe(false);
  });
});

describe("handleExportFuel says what went wrong in words", () => {
  it("shows the API's sentence, never the raw body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 400,
        headers: new Headers(),
        json: async () => ({
          code: "NOTHING_TO_EXPORT",
          message: "Não existem abastecimentos para exportar!",
        }),
        text: async () =>
          '{"code":"NOTHING_TO_EXPORT","message":"Não existem abastecimentos para exportar!"}',
      })),
    );

    const result = await handleExportFuel(undefined, "csv", {});

    expect(result.success).toBe(false);
    expect(result.message).toBe("Não existem abastecimentos para exportar!");
    expect(result.message).not.toContain("{");
  });

  it("names the file without the UTC day when the API sends no name", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "text/csv" }),
        arrayBuffer: async () => new ArrayBuffer(4),
      })),
    );

    const result = await handleExportFuel(undefined, "excel", {});

    expect(result.filename).toBe("relatorio-abastecimentos.xlsx");
  });
});

describe("handleUpdateFuel", () => {
  const typedForm = () => {
    const form = new FormData();

    form.set("fuelId", "018f0000-0000-7000-8000-0000000000f1");
    form.set("businessId", A);
    form.set("refueling_date", "2026-08-10T03:00:00.000Z");
    form.set("current_mileage", "15234");
    form.set("liters_amount", "45.5");
    form.set("price_per_liter", "R$ 5,49");
    form.set("notes", "");

    return form;
  };

  it("sends no link the person did not change", async () => {
    const result = await handleUpdateFuel({}, typedForm());

    expect(result).toEqual({
      successMessage: "Abastecimento atualizado com sucesso!",
    });

    const body = JSON.parse(String(calls[0].init?.body));

    expect(body).not.toHaveProperty("vehicleId");
    expect(body).not.toHaveProperty("driverId");
    expect(body).not.toHaveProperty("branchId");
    expect(body).not.toHaveProperty("fuelTypeId");
    expect(body).not.toHaveProperty("latitude");
    expect(body.price_per_liter).toBe(5.49);
  });

  it("sends the one link that changed", async () => {
    const form = typedForm();
    form.set("vehicleId", VEHICLE);

    await handleUpdateFuel({}, form);

    const body = JSON.parse(String(calls[0].init?.body));

    expect(body.vehicleId).toBe(VEHICLE);
    expect(body).not.toHaveProperty("driverId");
  });
});
