import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/actions/cookies", () => ({ getCookies: async () => "token" }));

import { handleDeleteFine } from "@/actions/fine/delete-fine";

/**
 * What the fine delete action sends and how it reads the answer.
 *
 * - A refusal is an error whatever its body says: one without a `message`
 *   (a 500 from a proxy, a 429 page) used to come back as success, and the
 *   dialog said "Multa deletada" while the fine stayed.
 * - The ids become segments of the API path: anything that is not an id is
 *   refused before a request is made, as the edit already did.
 */
const FINE = "018f0000-0000-7000-8000-0000000000f1";
const COMPANY = "018f0000-0000-7000-8000-00000000000a";

let answer: { ok: boolean; status: number; body: unknown } = {
  ok: true,
  status: 200,
  body: { message: "Multa deletada com sucesso!" },
};

const calls: string[] = [];

beforeEach(() => {
  process.env.HTTP_REQUEST = "http://api.test";
  calls.length = 0;

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      calls.push(String(input));

      return {
        ok: answer.ok,
        status: answer.status,
        json: async () => {
          if (answer.body instanceof Error) throw answer.body;
          return answer.body;
        },
      };
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("handleDeleteFine", () => {
  it("deletes in the fine's own company", async () => {
    answer = {
      ok: true,
      status: 200,
      body: { message: "Multa deletada com sucesso!" },
    };

    const result = await handleDeleteFine({
      fineId: FINE,
      businessId: COMPANY,
    });

    expect(calls).toEqual([
      `http://api.test/fines/delete-fine/${FINE}/business/${COMPANY}`,
    ]);
    expect(result).toEqual({ successMessage: "Multa deletada com sucesso!" });
  });

  it("reports a refusal without a message as an error, not as a deletion", async () => {
    answer = { ok: false, status: 500, body: {} };

    expect(
      await handleDeleteFine({ fineId: FINE, businessId: COMPANY }),
    ).toEqual({
      deleteFineError: "Não foi possível deletar a multa.",
    });

    answer = {
      ok: false,
      status: 502,
      body: new SyntaxError("Unexpected token <"),
    };

    expect(
      await handleDeleteFine({ fineId: FINE, businessId: COMPANY }),
    ).toEqual({
      deleteFineError: "Não foi possível deletar a multa.",
    });
  });

  it("passes the API's own sentence on", async () => {
    answer = {
      ok: false,
      status: 404,
      body: { code: "FINE_NOT_FOUND", message: "Multa não encontrada!" },
    };

    expect(
      await handleDeleteFine({ fineId: FINE, businessId: COMPANY }),
    ).toEqual({
      deleteFineError: "Multa não encontrada!",
    });
  });

  it("calls nothing for ids that are not ids", async () => {
    const result = await handleDeleteFine({
      fineId: "../../user/me",
      businessId: COMPANY,
    });
    const other = await handleDeleteFine({
      fineId: FINE,
      businessId: "../admin",
    });

    expect(calls).toEqual([]);
    expect(result).toEqual({ deleteFineError: "Multa não encontrada!" });
    expect(other).toEqual({ deleteFineError: "Multa não encontrada!" });
  });
});
