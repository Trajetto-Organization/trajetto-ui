import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The name of an exported file when the API sends none (decision 1.2).
 *
 * The API names every export with the company's day. The actions' fallback
 * used `new Date().toISOString().split("T")[0]` — the UTC day, and these run
 * on the Next server, in UTC: after 21:00 in São Paulo the file said
 * tomorrow. The fleet exports already fell back to a name with no date; the
 * others follow, and the browser's own fallback dates by the viewer's
 * calendar.
 */
vi.mock("@/actions/cookies", () => ({ getCookies: async () => "token" }));
vi.mock("@/lib/log-action-error", () => ({ logActionError: () => undefined }));

import { handleExportDelivery } from "@/actions/delivery/export-delivery";
import { handleExportOccurrence } from "@/actions/delivery/export-occurrence";
import { handleExportDriver } from "@/actions/driver/export-driver";
import { handleExportServiceOrder } from "@/actions/service-order/export-service-order";
import { handleExportVehicleChecklist } from "@/actions/vehicle-checklist/export-vehicle-checklist";
import {
  exportDeliveryRequest,
  exportDriverRequest,
  exportOccurrenceRequest,
  exportServiceOrderRequest,
  exportVehicleChecklistRequest,
} from "@/lib/export-requests";

let disposition: string | null = null;

beforeEach(() => {
  process.env.HTTP_REQUEST = "http://api.test";

  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: new Headers({
        "content-type": "text/csv",
        ...(disposition ? { "content-disposition": disposition } : {}),
      }),
      arrayBuffer: async () => new ArrayBuffer(4),
      json: async () => ({}),
      text: async () => "",
    })),
  );
});

afterEach(() => {
  disposition = null;
  vi.unstubAllGlobals();
});

const exports = [
  ["entregas", () => handleExportDelivery(undefined, "excel", {})],
  ["ocorrencias", () => handleExportOccurrence(undefined, "excel", {})],
  ["relatorio-motoristas", () => handleExportDriver(undefined, "excel", {})],
  [
    "relatorio-ordens-de-servico",
    () => handleExportServiceOrder(undefined, "excel", {}),
  ],
  [
    "relatorio-checklists",
    () => handleExportVehicleChecklist(undefined, "excel", {}),
  ],
] as const;

describe("an export the API did not name", () => {
  it.each(exports)("%s: carries no server-side day", async (name, run) => {
    const result = await run();

    expect(result.filename).toBe(`${name}.xlsx`);
  });
});

describe("an export the API named", () => {
  it.each(exports)(
    "%s: keeps the API's name, dated in the company's zone",
    async (_name, run) => {
      disposition = 'attachment; filename="export-2026-09-28.xlsx"';

      const result = await run();

      expect(result.filename).toBe("export-2026-09-28.xlsx");
    },
  );
});

describe("the browser's own fallback", () => {
  // The file now comes through the relay and is named in the browser
  // (src/lib/export-download.ts): the fallback is the request's undated
  // name, never a day computed anywhere.
  it("never dates the file by the UTC day", () => {
    for (const file of [
      "../../src/app/(protected)/_components/shared/custom/export-button/hooks/index.ts",
      "../../src/lib/export-download.ts",
      "../../src/lib/export-requests.ts",
    ]) {
      const source = readFileSync(resolve(__dirname, file), "utf8");

      expect(source, file).not.toMatch(/toISOString\(\)\.(split|slice)/);
    }
  });

  it.each([
    ["entregas", () => exportDeliveryRequest(undefined, "excel", {})],
    ["ocorrencias", () => exportOccurrenceRequest(undefined, "excel", {})],
    ["relatorio-motoristas", () => exportDriverRequest(undefined, "excel")],
    [
      "relatorio-ordens-de-servico",
      () => exportServiceOrderRequest(undefined, "excel"),
    ],
    [
      "relatorio-checklists",
      () => exportVehicleChecklistRequest(undefined, "excel"),
    ],
  ] as const)("%s: falls back to an undated name", (name, request) => {
    expect(request().fallbackFilename).toBe(`${name}.xlsx`);
  });
});
