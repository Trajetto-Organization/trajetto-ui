import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/actions/cookies", () => ({ getCookies: async () => "token" }));
vi.mock("@/lib/log-action-error", () => ({ logActionError: vi.fn() }));

import { handleExportDelivery } from "@/actions/delivery/export-delivery";
import { handleExportOccurrence } from "@/actions/delivery/export-occurrence";

import { exportActionFor } from "@/features/deliveries/lib/export-action";
import { exportErrorMessage } from "@/features/deliveries/lib/export-query";

/**
 * The deliveries and occurrences exports (DLV-EXP-1/2, decision 5.8).
 *
 * On /admin the MASTER has no company of their own. The export button called
 * the action with (search, format) only, the action never sent the company,
 * and the API answered 400 BUSINESS_NOT_IDENTIFIED — the toast in the print.
 * And the file ignored the table's filters, so it was not what the screen
 * showed.
 */
const BUSINESS = "018f0000-0000-7000-8000-00000000000b";
const SHIPPER = "018f0000-0000-7000-8000-0000000000f1";
const TYPE = "018f0000-0000-7000-8000-0000000000c1";

let requested: string[] = [];

beforeEach(() => {
  requested = [];

  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      requested.push(url);

      return new Response("id\n", {
        status: 200,
        headers: {
          "content-type": "text/csv",
          "content-disposition":
            'attachment; filename="entregas-2026-09-28.csv"',
        },
      });
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function queryOf(url: string): URLSearchParams {
  return new URL(url, "http://api.local").searchParams;
}

describe("the export bound by the page", () => {
  it("sends the company chosen on /admin and the table's facets", async () => {
    const bound = exportActionFor("deliveries", {
      businessId: BUSINESS,
      searchParams: new URLSearchParams(
        `page=3&status=PENDING,FAILED&shipperId=${SHIPPER}&sort=status&order=desc&tab=deliveries`,
      ),
    });

    const result = await bound("mercado", "excel");

    expect(result.success).toBe(true);

    const query = queryOf(requested[0]);

    expect(query.get("businessId")).toBe(BUSINESS);
    expect(query.get("search")).toBe("mercado");
    expect(query.get("format")).toBe("excel");
    expect(query.get("status")).toBe("PENDING,FAILED");
    expect(query.get("shipperId")).toBe(SHIPPER);

    // Paging and ordering are the screen's business, not the file's.
    expect(query.has("page")).toBe(false);
    expect(query.has("tab")).toBe(false);
  });

  it("sends the occurrence feed's facets for the occurrences tab", async () => {
    const bound = exportActionFor("occurrences", {
      businessId: BUSINESS,
      searchParams: new URLSearchParams(
        `severity=blocking&occurrenceTypeId=${TYPE}&deliveryStatus=FAILED`,
      ),
    });

    await bound(undefined, "csv");

    expect(requested[0]).toContain("/delivery/export-occurrence?");

    const query = queryOf(requested[0]);

    expect(query.get("businessId")).toBe(BUSINESS);
    expect(query.get("severity")).toBe("blocking");
    expect(query.get("occurrenceTypeId")).toBe(TYPE);
    expect(query.get("deliveryStatus")).toBe("FAILED");
  });

  it("sends no company when the page has none (the API uses the session's)", async () => {
    await exportActionFor("deliveries", {
      businessId: null,
      searchParams: new URLSearchParams(""),
    })(undefined, "csv");

    expect(queryOf(requested[0]).has("businessId")).toBe(false);
  });
});

describe("the actions themselves", () => {
  it("carry the company for the MASTER (DLV-EXP-1)", async () => {
    await handleExportDelivery(undefined, "csv", { businessId: BUSINESS });
    await handleExportOccurrence(undefined, "csv", { businessId: BUSINESS });

    expect(queryOf(requested[0]).get("businessId")).toBe(BUSINESS);
    expect(queryOf(requested[1]).get("businessId")).toBe(BUSINESS);
  });

  it("show the API's sentence, not its raw JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              code: "BUSINESS_NOT_IDENTIFIED",
              message:
                "Empresa não identificada. Selecione uma empresa para continuar.",
            }),
            { status: 400 },
          ),
      ),
    );

    const result = await handleExportOccurrence();

    expect(result.success).toBe(false);
    expect(result.message).toBe(
      "Erro ao gerar relatório: Empresa não identificada. Selecione uma empresa para continuar.",
    );
    expect(exportErrorMessage(502, "<html>")).toBe(
      "Erro ao gerar relatório (código 502). Tente novamente.",
    );
  });
});
