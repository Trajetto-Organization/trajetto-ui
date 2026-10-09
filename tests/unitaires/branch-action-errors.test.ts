import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The branch create and update actions on a refusal without a message.
 *
 * Both read `if (!response.ok && message)`: a 4xx/5xx whose body carried no
 * `message` fell through to `{ successMessage: undefined }`, so the form
 * neither closed nor said anything — the save simply seemed to do nothing.
 * The body is the form's, not under test: the schema is stubbed to accept it.
 */
vi.mock("@/actions/cookies", () => ({ getCookies: async () => "token" }));
vi.mock("@/lib/log-action-error", () => ({ logActionError: () => undefined }));
vi.mock("@/schemas/create-update-branch-schema", () => ({
  createUpdateBranchSchema: {
    safeParse: (value: unknown) => ({
      success: true,
      data: value,
      error: undefined,
    }),
  },
}));

import { handleCreateBranch } from "@/actions/branch/create-branch";
import { handleUpdateBranch } from "@/actions/branch/update-branch";

let answer: { status: number; body: unknown } = { status: 200, body: {} };

beforeEach(() => {
  process.env.HTTP_REQUEST = "http://api.test";

  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(JSON.stringify(answer.body), { status: answer.status }),
    ),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function form(): FormData {
  const data = new FormData();
  data.set("businessId", "018f0000-0000-7000-8000-00000000000a");
  data.set("branchId", "018f0000-0000-7000-8000-0000000000b1");
  data.set("corporate_reason", "Filial Centro");

  return data;
}

describe("a refused branch save with no message in the body", () => {
  it.each([
    [500, {}],
    [409, { code: "BRANCH_CNPJ_UNAVAILABLE" }],
  ])("create: %s says it failed", async (status, body) => {
    answer = { status, body };

    const result = (await handleCreateBranch(undefined, form())) as Record<
      string,
      unknown
    >;

    expect(result.successMessage).toBeUndefined();
    expect(result.createBranchError).toEqual({
      createBranchErrorMessage: expect.stringMatching(/criar a filial/),
    });
  });

  it.each([
    [500, {}],
    [403, { code: "PERMISSION_DENIED" }],
  ])("update: %s says it failed", async (status, body) => {
    answer = { status, body };

    const result = (await handleUpdateBranch(undefined, form())) as Record<
      string,
      unknown
    >;

    expect(result.successMessage).toBeUndefined();
    expect(result.updateBranchError).toEqual({
      updateBranchErrorMessage: expect.stringMatching(/atualizar a filial/),
    });
  });
});

describe("the messages that do arrive", () => {
  it("shows the API's refusal as it came", async () => {
    answer = { status: 409, body: { message: "CNPJ já cadastrado." } };

    const result = (await handleCreateBranch(undefined, form())) as Record<
      string,
      unknown
    >;

    expect(result.createBranchError).toEqual({
      createBranchErrorMessage: "CNPJ já cadastrado.",
    });
  });

  it("keeps a success a success", async () => {
    answer = {
      status: 200,
      body: { message: "Filial atualizada com sucesso!" },
    };

    const result = (await handleUpdateBranch(undefined, form())) as Record<
      string,
      unknown
    >;

    expect(result.successMessage).toBe("Filial atualizada com sucesso!");
  });
});
