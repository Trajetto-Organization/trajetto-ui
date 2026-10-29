import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { downloadExport, filenameFromDisposition } from "@/lib/export-download";
import {
  exportAccountPayableRequest,
  exportDeliveryRequest,
  exportDriverRequest,
  exportFineRequest,
  exportFuelRequest,
  exportOccurrenceRequest,
  exportServiceOrderRequest,
  exportVehicleChecklistRequest,
  exportVehicleRequest,
} from "@/lib/export-requests";
import { isRelayPath } from "@/lib/api-relay-paths";

/**
 * Exports through the relay, not a Server Action.
 *
 * The nine export actions read the whole file into the Next heap, encoded it
 * in base64 and returned it in the action's answer, and the page decoded it
 * byte by byte: ~4.5x the file in a 512 MB heap, so ten exports of 17 MB at
 * once took the single web container down, a file past ~400 MB could never
 * download, and closing the tab left the API working. Now the browser fetches
 * the file from the relay (which streams it) and saves the Blob itself.
 */
const BUSINESS = "018f0000-0000-7000-8000-00000000000b";

let clicked: Array<{ href: string; download: string }> = [];

beforeEach(() => {
  clicked = [];

  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    clicked.push({ href: this.href, download: this.download });
  });

  URL.createObjectURL = vi.fn(() => "blob:http://app.test/1");
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const request = exportVehicleRequest("abc", "excel", { businessId: BUSINESS });

describe("downloadExport", () => {
  it("asks the relay for the file and saves it under the API's name", async () => {
    vi.useFakeTimers();

    const fetchMock = vi.fn(
      async () =>
        new Response("placa\nABC1D23\n", {
          status: 200,
          headers: {
            "content-type": "text/csv",
            "content-disposition":
              "attachment; filename=\"veiculos.csv\"; filename*=UTF-8''ve%C3%ADculos-2026-10-28.csv",
            "x-total-records": "1",
          },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await downloadExport(request);

    expect(fetchMock).toHaveBeenCalledWith(request.url, expect.anything());
    expect(request.url.startsWith("/api/relay/vehicle/export-vehicle?")).toBe(
      true,
    );

    expect(result).toEqual({
      ok: true,
      filename: "veículos-2026-10-28.csv",
      size: 14,
      totalRecords: 1,
    });
    expect(clicked).toEqual([
      { href: "blob:http://app.test/1", download: "veículos-2026-10-28.csv" },
    ]);

    // Let go of the Blob, after the browser had time to start the download.
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(10_000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:http://app.test/1");
  });

  it("falls back to the request's undated name", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("x", { status: 200 })),
    );

    const result = await downloadExport(request);

    expect(result.ok && result.filename).toBe("relatorio-veiculos.xlsx");
  });

  it("says the API's own sentence for a refusal", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          { message: "Não existem veículos para exportar!" },
          { status: 400 },
        ),
      ),
    );

    expect(await downloadExport(request)).toEqual({
      ok: false,
      message: "Não existem veículos para exportar!",
    });
    expect(clicked).toEqual([]);
  });

  it("says how long to wait when the API is busy (429 + Retry-After)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          {
            code: "EXPORT_BUSY",
            message: "Há muitas exportações em andamento.",
          },
          { status: 429, headers: { "retry-after": "30" } },
        ),
      ),
    );

    const result = await downloadExport(request);

    expect(result).toEqual({
      ok: false,
      message: "Há muitas exportações em andamento. Tente de novo em 30 s.",
    });
  });

  it("has a sentence of its own when the refusal brings none", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<html>", { status: 502 })),
    );

    const result = await downloadExport(request);

    expect(result.ok === false && result.message).toBe(request.refusalFallback);
  });

  it("stops when the page goes away, saying nothing", async () => {
    const controller = new AbortController();

    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) =>
            init?.signal?.addEventListener("abort", () =>
              reject(new DOMException("aborted", "AbortError")),
            ),
          ),
      ),
    );

    const pending = downloadExport(request, { signal: controller.signal });
    controller.abort();

    expect(await pending).toMatchObject({ ok: false, aborted: true });
  });
});

describe("filenameFromDisposition", () => {
  it.each([
    ['attachment; filename="a b.csv"', "a b.csv"],
    ["attachment; filename=plain.xlsx", "plain.xlsx"],
    ["attachment; filename*=UTF-8''ocorr%C3%AAncias.csv", "ocorrências.csv"],
    ["inline", null],
    [null, null],
  ])("%s → %s", (value, expected) => {
    expect(filenameFromDisposition(value)).toBe(expected);
  });
});

describe("the nine export requests", () => {
  const requests = [
    exportDeliveryRequest(undefined, "csv", {}),
    exportOccurrenceRequest(undefined, "csv", {}),
    exportDriverRequest(undefined, "csv"),
    exportFineRequest({ format: "csv" }),
    exportFuelRequest(undefined, "csv"),
    exportServiceOrderRequest(undefined, "csv"),
    exportVehicleRequest(undefined, "csv"),
    exportVehicleChecklistRequest(undefined, "csv"),
    exportAccountPayableRequest({ format: "csv" }),
  ];

  it("all go to a path the relay lets through", () => {
    for (const { url } of requests) {
      const path = new URL(url, "http://app.test").pathname.replace(
        /^\/api\/relay/,
        "",
      );

      expect(isRelayPath(path), path).toBe(true);
    }
  });

  it("carry only a company that is a company id", () => {
    const query = (url: string) => new URL(url, "http://app.test").searchParams;

    expect(
      query(exportFineRequest({ businessId: "../../user/me" }).url).has(
        "businessId",
      ),
    ).toBe(false);
    expect(
      query(exportAccountPayableRequest({ businessId: BUSINESS }).url).get(
        "businessId",
      ),
    ).toBe(BUSINESS);
  });

  it("drop a fuel facet that is not an id", () => {
    const url = exportFuelRequest(undefined, "csv", {
      vehicleId: "not-an-id",
      businessId: BUSINESS,
      other: BUSINESS,
    }).url;
    const query = new URL(url, "http://app.test").searchParams;

    expect(query.has("vehicleId")).toBe(false);
    expect(query.has("other")).toBe(false);
    expect(query.get("businessId")).toBe(BUSINESS);
  });

  it("keep the screen's facets and company", () => {
    const url = exportVehicleChecklistRequest("pneu", "excel", {
      businessId: BUSINESS,
      filters: { overall_condition: "BAD", page: "3" },
    }).url;
    const query = new URL(url, "http://app.test").searchParams;

    expect(Object.fromEntries(query)).toEqual({
      search: "pneu",
      format: "excel",
      businessId: BUSINESS,
      overall_condition: "BAD",
    });
  });
});
