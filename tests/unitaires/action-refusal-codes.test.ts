import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Server Actions on a refusal, after the API's error contract changed
 * (decision 11.3: every 4xx carries `code` and the `x-error-code` header;
 * deletion confirmations answer 409 *_DELETION_NOT_REQUESTED).
 *
 * Two defects: 86 actions read `if (!response.ok && message)`, so a refusal
 * whose body had no message fell through as `{ successMessage: undefined }`
 * — a delete the API refused looked done. And the deletion dialogs read a
 * 409 "nothing to confirm" as just another conflict, leaving the person
 * retyping a code that can never work.
 */
vi.mock("@/actions/cookies", () => ({ getCookies: async () => "token" }));
vi.mock("@/lib/log-action-error", () => ({ logActionError: () => undefined }));
vi.mock("@/actions/revalidate", () => ({
  revalidateTagName: async () => undefined,
}));
vi.mock("next/headers", () => ({ headers: () => new Headers() }));

import { handleDeleteBranch } from "@/actions/branch/delete-branch";
import { handleDeleteBusiness } from "@/actions/business/delete-business";
import { handleRequestBranchDeletion } from "@/actions/branch/request-branch-deletion";
import { handleDeleteNotification } from "@/actions/notifications";
import { handleDeleteDriver } from "@/actions/driver/delete-driver";
import { newVerification } from "@/actions/user/new-verification";
import { needsNewDeletionCode, refusalMessage } from "@/lib/api-error";

let answer: {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
} = {
  status: 200,
  body: {},
};

beforeEach(() => {
  process.env.HTTP_REQUEST = "http://api.test";

  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(JSON.stringify(answer.body), {
          status: answer.status,
          headers: answer.headers,
        }),
    ),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const BRANCH = {
  businessId: "018f0000-0000-7000-8000-00000000000a",
  branchId: "018f0000-0000-7000-8000-0000000000b1",
  code: "123456",
};

describe("a refusal with no message is still a refusal", () => {
  it.each([
    [500, {}],
    [404, { code: "BRANCH_NOT_FOUND" }],
  ])("delete branch: %s is not reported as deleted", async (status, body) => {
    answer = { status, body };

    const result = (await handleDeleteBranch(BRANCH)) as Record<
      string,
      unknown
    >;

    expect(result.successMessage).toBeUndefined();
    expect(result.deleteBranchError).toBe(refusalMessage(status));
  });

  it("request branch deletion: a 409 without message says it failed", async () => {
    answer = { status: 409, body: { code: "BRANCH_IN_USE" } };

    const result = (await handleRequestBranchDeletion({
      businessId: BRANCH.businessId,
      branchId: BRANCH.branchId,
    })) as Record<string, unknown>;

    expect(result.successMessage).toBeUndefined();
    expect(result.requestBranchDeletionError).toBe(refusalMessage(409));
  });

  it("delete notification: another user's notification (404) is not removed from the list", async () => {
    answer = { status: 404, body: { code: "NOTIFICATION_NOT_FOUND" } };

    const result = (await handleDeleteNotification("n-1")) as Record<
      string,
      unknown
    >;

    expect(result.deletedNotificationId).toBeUndefined();
    expect(result.deleteNotificationError).toBe(refusalMessage(404));
  });

  it("delete driver: a 500 without message is not a success", async () => {
    answer = { status: 500, body: { code: "INTERNAL_ERROR" } };

    const result = (await handleDeleteDriver({
      businessId: BRANCH.businessId,
      driverId: "018f0000-0000-7000-8000-0000000000d1",
    })) as Record<string, unknown>;

    expect(result.successMessage).toBeUndefined();
    expect(result.deleteDriverError).toBe(refusalMessage(500));
  });

  it("keeps the API's own sentence when it sent one", async () => {
    answer = {
      status: 404,
      body: {
        code: "NOTIFICATION_NOT_FOUND",
        message: "Notificação não encontrada!",
      },
    };

    const result = (await handleDeleteNotification("n-1")) as Record<
      string,
      unknown
    >;

    expect(result.deleteNotificationError).toBe("Notificação não encontrada!");
  });
});

describe("a deletion confirmation the code can no longer satisfy", () => {
  it.each([
    ["BRANCH_DELETION_NOT_REQUESTED", 409],
    ["BRANCH_DELETION_CODE_EXPIRED", 400],
  ])("branch %s asks for a new code", async (code, status) => {
    answer = {
      status,
      body: {
        code,
        message:
          "Nenhuma solicitação de exclusão pendente. Solicite a exclusão novamente.",
      },
    };

    const result = (await handleDeleteBranch(BRANCH)) as Record<
      string,
      unknown
    >;

    expect(result).toMatchObject({
      deleteBranchError:
        "Nenhuma solicitação de exclusão pendente. Solicite a exclusão novamente.",
      errorCode: code,
      requestNewCode: true,
    });
  });

  it("business 409 BUSINESS_DELETION_NOT_REQUESTED asks for a new code, read from the header too", async () => {
    answer = {
      status: 409,
      body: { message: "Nenhuma solicitação de exclusão pendente." },
      headers: { "x-error-code": "BUSINESS_DELETION_NOT_REQUESTED" },
    };

    const result = (await handleDeleteBusiness({
      businessId: BRANCH.businessId,
      code: "123456",
    })) as Record<string, unknown>;

    expect(result).toMatchObject({
      errorCode: "BUSINESS_DELETION_NOT_REQUESTED",
      requestNewCode: true,
    });
  });

  it("a wrong code is retyped, not re-requested", async () => {
    answer = {
      status: 400,
      body: {
        code: "BRANCH_DELETION_CODE_INVALID",
        message: "Código inválido.",
      },
    };

    const result = (await handleDeleteBranch(BRANCH)) as Record<
      string,
      unknown
    >;

    expect(result).toMatchObject({
      deleteBranchError: "Código inválido.",
      errorCode: "BRANCH_DELETION_CODE_INVALID",
    });
    expect(result.requestNewCode).toBeUndefined();
  });

  it("a branch still in use is a plain conflict", () => {
    expect(needsNewDeletionCode("BRANCH_IN_USE")).toBe(false);
    expect(needsNewDeletionCode("BUSINESS_IN_USE")).toBe(false);
    expect(needsNewDeletionCode(undefined)).toBe(false);
  });
});

describe("the fallback sentences", () => {
  it("are pt-BR, per status, and never empty", () => {
    expect(refusalMessage(404)).toMatch(/não foi encontrado/);
    expect(refusalMessage(409)).toMatch(/Atualize a página/);
    expect(refusalMessage(429)).toMatch(/Aguarde/);
    expect(refusalMessage(503)).toMatch(/servidor/);
    expect(refusalMessage(418)).toMatch(/Não foi possível/);
  });
});

describe("e-mail verification is decided by the status, not by the message", () => {
  it("a refusal with no message still reads as a refusal, with a sentence", async () => {
    answer = { status: 400, body: { code: "AUTH_TOKEN_EXPIRED" } };

    const result = await newVerification("token");

    expect(result.successMessage).toBeUndefined();
    expect(result.error?.errorMessage).toBe(refusalMessage(400));
  });

  it("a 200 with no message is still a verified e-mail", async () => {
    answer = { status: 200, body: {} };

    const result = await newVerification("token");

    expect(result.error).toBeUndefined();
    expect(result.successMessage).toMatch(/verificado/);
  });

  it("the API's own sentence wins", async () => {
    answer = {
      status: 400,
      body: { code: "AUTH_TOKEN_INVALID", message: "Token inválido!" },
    };

    expect((await newVerification("token")).error?.errorMessage).toBe(
      "Token inválido!",
    );
  });
});
