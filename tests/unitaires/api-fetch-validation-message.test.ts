import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The API's schema refusal, as a Server Action hands it to the screen.
 *
 * A 400 VALIDATION_ERROR carries `message: "Validation Error"` and the
 * field's own sentence in `issues`. Ninety actions show
 * `message || refusalMessage(status)`, so the screen printed the English
 * "Validation Error": the "Adicionar entregas" sheet on its default filter
 * (route-detail.spec.ts) and the service-order form on a vehicle with no
 * previous review (journey-fleet.spec.ts). apiFetch now hands the actions a
 * body whose `message` is the sentence a person can act on.
 */
const revalidatePath = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({ revalidatePath }));

import { apiFetch } from "@/lib/api-fetch";
import { readableValidationMessage, refusalMessage } from "@/lib/api-error";

let answer: { status: number; body?: unknown; raw?: string };

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(answer.raw ?? JSON.stringify(answer.body), {
          status: answer.status,
          headers: {
            "content-type": "application/json",
            "x-error-code": "VALIDATION_ERROR",
          },
        }),
    ),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** What every one of those actions does with the answer. */
async function shownBy(response: Response): Promise<string> {
  const { message } = (await response.json()) as { message?: string };

  return message || refusalMessage(response.status);
}

describe("apiFetch and the API's schema refusal", () => {
  it("shows the field's sentence instead of 'Validation Error'", async () => {
    answer = {
      status: 400,
      body: {
        code: "VALIDATION_ERROR",
        message: "Validation Error",
        issues: ["A quilometragem da última revisão é obrigatória."],
      },
    };

    const response = await apiFetch(
      "http://api.test/service-order/create-service-order/b",
    );

    expect(response.status).toBe(400);
    expect(response.headers.get("x-error-code")).toBe("VALIDATION_ERROR");
    expect(await shownBy(response.clone())).toBe(
      "A quilometragem da última revisão é obrigatória.",
    );
    // The rest of the body is the API's, untouched.
    expect(await response.json()).toMatchObject({
      code: "VALIDATION_ERROR",
      issues: ["A quilometragem da última revisão é obrigatória."],
    });
  });

  it("falls back to the Portuguese text when the only sentence is zod's English default", async () => {
    answer = {
      status: 400,
      body: {
        code: "VALIDATION_ERROR",
        message: "Validation Error",
        issues: ["Expected boolean, received string"],
      },
    };

    expect(
      await shownBy(
        await apiFetch("http://api.test/route/unrouted-deliveries/b"),
      ),
    ).toBe(refusalMessage(400));
  });

  it("leaves alone a refusal already in Portuguese, another status, and a body that is not JSON", async () => {
    answer = {
      status: 400,
      body: {
        code: "ROUTE_DATE_IN_PAST",
        message: "A data da rota já passou.",
      },
    };
    expect(await shownBy(await apiFetch("http://api.test/x"))).toBe(
      "A data da rota já passou.",
    );

    answer = {
      status: 409,
      body: { code: "VALIDATION_ERROR", message: "Validation Error" },
    };
    expect(await (await apiFetch("http://api.test/x")).json()).toEqual({
      code: "VALIDATION_ERROR",
      message: "Validation Error",
    });

    answer = { status: 400, raw: "<html>Bad Request</html>" };
    expect(await (await apiFetch("http://api.test/x")).text()).toBe(
      "<html>Bad Request</html>",
    );
  });

  it("the pure rule, field by field", () => {
    expect(
      readableValidationMessage({
        code: "VALIDATION_ERROR",
        message: "Validation Error",
        issues: [],
      }),
    ).toBe(refusalMessage(400));
    expect(
      readableValidationMessage({
        code: "VALIDATION_ERROR",
        issues: ["Required", "Required"],
      }),
    ).toBe(refusalMessage(400));
    expect(
      readableValidationMessage({ code: "OTHER", message: "Validation Error" }),
    ).toBeNull();
    expect(readableValidationMessage(null)).toBeNull();
  });
});
