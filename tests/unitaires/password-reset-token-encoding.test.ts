// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The password-reset actions put the e-mailed token in the API call's query
 * string. They are Server Actions, so the browser sends any value it likes:
 * unencoded, `abc&password=x` reached the API as two parameters, and a File
 * from FormData as "[object File]". The token is now one encoded parameter.
 */
vi.mock("next/headers", () => ({
  headers: () => new Headers(),
  cookies: () => ({ get: () => undefined }),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { newResetPasswordVerification } from "@/actions/user/new-reset-password-verification";
import { handleResetPassword } from "@/actions/user/reset-user-password";

const fetchMock = vi.fn();
const HOSTILE = "abc&password=chosen#frag";

beforeEach(() => {
  process.env.HTTP_REQUEST = "https://api.trajetto.test";
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify({ message: "ok" }), { status: 200 }),
  );
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function calledUrl(): URL {
  return new URL(fetchMock.mock.calls[0][0] as string);
}

describe("newResetPasswordVerification", () => {
  it("sends the token as one encoded parameter", async () => {
    await newResetPasswordVerification(HOSTILE);

    const url = calledUrl();

    expect(url.pathname).toBe("/user/forgot-verification");
    expect([...url.searchParams.keys()]).toEqual(["token"]);
    expect(url.searchParams.get("token")).toBe(HOSTILE);
    expect(url.hash).toBe("");
  });

  it("calls nothing for a value that is not a token", async () => {
    const result = await newResetPasswordVerification({
      toString: () => "x",
    } as unknown as string);

    expect(result?.error).toBeDefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("handleResetPassword", () => {
  function form(token: FormDataEntryValue): FormData {
    const data = new FormData();
    data.set("token", token);
    data.set("password", "Senha@Forte2026");
    data.set("confirm_password", "Senha@Forte2026");
    return data;
  }

  it("sends the token as one encoded parameter", async () => {
    await handleResetPassword(null, form(HOSTILE));

    const url = calledUrl();

    expect([...url.searchParams.keys()]).toEqual(["token"]);
    expect(url.searchParams.get("token")).toBe(HOSTILE);
  });

  it("refuses a file in place of the token", async () => {
    const result = await handleResetPassword(
      null,
      form(new File(["x"], "token.txt")),
    );

    expect(result).toHaveProperty("resetPasswordError");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
