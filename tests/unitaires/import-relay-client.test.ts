import { afterEach, describe, expect, it, vi } from "vitest";

import {
  STILL_RUNNING,
  acceptedImportId,
  submitSpreadsheetImport,
  waitForImport,
} from "@/features/deliveries/deliveries/import-spreadsheet-dialog/hooks/import-client";
import { sendXmlImport } from "@/features/deliveries/deliveries/import-xml-dialog/hooks/import-client";
import { MAX_FILE_SIZE } from "@/features/deliveries/deliveries/import-spreadsheet-dialog/hooks";

/**
 * The imports through the relay, and the spreadsheet import that runs in the
 * background.
 *
 * Both were Server Actions taking the file base64 as an argument, and Next
 * 14 caps an action's body at 1 MB: anything past ~750 KB failed, while the
 * dialog promised 6 MB of spreadsheet and 25 NF-e of 512 KB. They now POST
 * the same JSON to the relay. And the API is moving the spreadsheet import
 * to the background (202 with the import id): the dialog follows it with
 * get-import until it leaves IN_PROGRESS — and still reads the synchronous
 * 200, so the order of the API and web deploys does not matter.
 */
const BUSINESS = "018f0000-0000-7000-8000-00000000000b";
const SHIPPER = "018f0000-0000-7000-8000-0000000000f1";
const IMPORT = "018f0000-0000-7000-8000-0000000000a1";

const FILE = { filename: "carga.xlsx", content: "UEsDBA==" };

const row = (line: number, outcome: string, recipient_name: string) => ({
  line,
  outcome,
  recipient_name,
  reference: null,
  message: null,
});

const REPORT = {
  imported: 2,
  duplicated: 1,
  invalid: 0,
  unknownHeaders: [],
  rows: [
    row(2, "imported", "A"),
    row(3, "imported", "B"),
    row(4, "duplicated", "C"),
  ],
  routes: [],
};

const FINISHED = {
  id: IMPORT,
  imported: 2,
  duplicated: 1,
  invalid: 0,
  report: REPORT,
};

const fast = { firstDelayMs: 1, maxDelayMs: 1 };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("submitSpreadsheetImport", () => {
  it("posts the API's own JSON to the relay", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        message: "2 entrega(s) importada(s), 1 duplicada(s), 0 com erro.",
        data: FINISHED,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await submitSpreadsheetImport(BUSINESS, FILE, SHIPPER);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];

    expect(url).toBe(`/api/relay/import/import-spreadsheet/${BUSINESS}`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({
      ...FILE,
      shipperId: SHIPPER,
    });
  });

  it("reads the synchronous 200 as the finished import (older API)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          message: "2 entrega(s) importada(s), 1 duplicada(s), 0 com erro.",
          data: FINISHED,
        }),
      ),
    );

    const answer = await submitSpreadsheetImport(BUSINESS, FILE, SHIPPER);

    expect(answer).toMatchObject({
      ok: true,
      message: "2 entrega(s) importada(s), 1 duplicada(s), 0 com erro.",
      result: { id: IMPORT, imported: 2 },
    });
  });

  it("follows a 202 until the import leaves IN_PROGRESS", async () => {
    const progress: Array<number | null> = [];
    const accepted = vi.fn();
    let reads = 0;

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return Response.json(
          {
            message: "Importação recebida.",
            data: { id: IMPORT, status: "IN_PROGRESS" },
          },
          { status: 202 },
        );
      }

      reads += 1;

      return Response.json({
        data:
          reads < 3
            ? {
                id: IMPORT,
                status: "IN_PROGRESS",
                imported: reads,
                duplicated: 0,
                invalid: 0,
              }
            : {
                id: IMPORT,
                status: "COMPLETED",
                imported: 2,
                duplicated: 1,
                invalid: 0,
                report: REPORT,
              },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const answer = await submitSpreadsheetImport(BUSINESS, FILE, SHIPPER, {
      onAccepted: accepted,
      onProgress: ({ processedRows }) => progress.push(processedRows),
      wait: fast,
    });

    expect(accepted).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[1][0]).toBe(
      `/api/relay/import/get-import/${IMPORT}/business/${BUSINESS}`,
    );
    expect(progress).toEqual([1, 2]);
    expect(answer).toEqual({
      ok: true,
      message: "2 entrega(s) importada(s), 1 duplicada(s), 0 com erro.",
      result: {
        id: IMPORT,
        imported: 2,
        duplicated: 1,
        invalid: 0,
        report: REPORT,
      },
    });
  });

  it("says the API's refusal", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          { code: "SHIPPER_NOT_FOUND", message: "Embarcador não encontrado." },
          { status: 404 },
        ),
      ),
    );

    expect(await submitSpreadsheetImport(BUSINESS, FILE, SHIPPER)).toEqual({
      ok: false,
      message: "Embarcador não encontrado.",
    });
  });

  it("tells the operator to check the list when the send itself failed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );

    const answer = await submitSpreadsheetImport(BUSINESS, FILE, SHIPPER);

    expect(answer.ok).toBe(false);
    expect(answer.message).toMatch(/aba Importações/);
  });
});

describe("waitForImport", () => {
  it("hands over to the Importações tab when the reads keep failing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 503 })),
    );

    expect(await waitForImport(IMPORT, BUSINESS, fast)).toEqual({
      ok: false,
      message: STILL_RUNNING,
      stillRunning: true,
    });
  });

  it("stops waiting past its ceiling, the import still running", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ data: { id: IMPORT, status: "IN_PROGRESS" } }),
      ),
    );

    const answer = await waitForImport(IMPORT, BUSINESS, {
      ...fast,
      ceilingMs: 20,
    });

    expect(answer).toMatchObject({ ok: false, stillRunning: true });
  });

  it("stops following when the dialog closes, saying nothing new", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ data: { id: IMPORT, status: "IN_PROGRESS" } }),
      ),
    );

    const controller = new AbortController();
    const pending = waitForImport(IMPORT, BUSINESS, {
      ...fast,
      signal: controller.signal,
    });

    controller.abort();

    expect(await pending).toMatchObject({ ok: false, aborted: true });
  });

  it("says why a run that ended in failure did not finish", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          data: {
            id: IMPORT,
            status: "FAILED",
            message: "A planilha não pôde ser lida.",
          },
        }),
      ),
    );

    expect(await waitForImport(IMPORT, BUSINESS, fast)).toEqual({
      ok: false,
      message: "A planilha não pôde ser lida.",
    });
  });
});

describe("acceptedImportId", () => {
  it.each([
    [{ data: { id: IMPORT } }],
    [{ data: { importId: IMPORT } }],
    [{ id: IMPORT }],
    [{ importId: IMPORT }],
  ])("reads the id from %j", (body) => {
    expect(acceptedImportId(body)).toBe(IMPORT);
  });

  it("is null without one", () => {
    expect(acceptedImportId(null)).toBeNull();
    expect(acceptedImportId({ data: {} })).toBeNull();
  });
});

describe("sendXmlImport", () => {
  it("posts the files to the relay, with the options the API takes", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        message: "1 nota importada.",
        data: {
          imported: 1,
          duplicated: 0,
          invalid: 0,
          created_shippers: [],
          results: [],
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const answer = await sendXmlImport(
      BUSINESS,
      [{ filename: "nfe.xml", content: "<nfeProc/>" }],
      { shipperId: SHIPPER },
    );

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];

    expect(url).toBe(`/api/relay/delivery/import-xml/${BUSINESS}`);
    expect(JSON.parse(String(init.body))).toEqual({
      files: [{ filename: "nfe.xml", content: "<nfeProc/>" }],
      shipperId: SHIPPER,
    });
    expect(answer).toMatchObject({
      success: true,
      message: "1 nota importada.",
    });
  });
});

describe("the size the dialog promises", () => {
  it("fits under the relay's ceiling once base64-encoded in its JSON", async () => {
    const { relayUploadLimit } = await import("@/lib/api-relay-paths");

    const base64 = Math.ceil(MAX_FILE_SIZE / 3) * 4;
    const limit = relayUploadLimit(`/import/import-spreadsheet/${BUSINESS}`);

    expect(limit).not.toBeNull();
    expect(base64 + 1024).toBeLessThan(limit!);
  });
});
