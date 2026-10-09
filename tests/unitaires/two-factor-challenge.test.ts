import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The web half of binding two-factor to the password step (WEB-07).
 *
 * The API now answers a password login that stops at two-factor with a
 * `twoFactorChallenge`, and accepts the code — and a resend — only next to it
 * (once TWO_FACTOR_CHALLENGE_REQUIRED is on). The web keeps it where no script
 * can read it: an HttpOnly cookie written by the login action and read back,
 * server-side, by the two-factor and resend actions. The browser never sees
 * the value.
 *
 * Against an API that does not send one yet, nothing changes: no cookie, and
 * the bodies stay exactly what they were.
 */
interface StoredCookie {
  value: string;
  options?: Record<string, unknown>;
}

const jar = new Map<string, StoredCookie>();

vi.mock("next/headers", () => ({
  cookies: () => ({
    get: (name: string) =>
      jar.has(name) ? { name, value: jar.get(name)!.value } : undefined,
    set: (name: string, value: string, options?: Record<string, unknown>) => {
      jar.set(name, { value, options });
    },
    delete: (name: string) => {
      jar.delete(name);
    },
  }),
  headers: () => new Headers(),
}));

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

vi.mock("@/actions/user/user-authentication", () => ({
  handleAuthenticateUser: vi.fn(async () => undefined),
}));

import { handleLoginUser } from "@/actions/user/login-user";
import { handleTwoFactorAuthenticationUser } from "@/actions/user/two-factor-authentication-user";
import { handleResendTwoFactorCode } from "@/actions/user/resend-two-factor-code";

const EMAIL = "gestora@exemplo.com.br";

let answers: unknown[] = [];
const sent: Array<{ url: string; body: Record<string, unknown> }> = [];

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

beforeEach(() => {
  jar.clear();
  sent.length = 0;
  answers = [];

  process.env.HTTP_REQUEST = "https://api.exemplo.test";

  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      sent.push({ url, body: JSON.parse(String(init.body)) });

      const answer = answers.shift() ?? { message: "ok" };

      return new Response(JSON.stringify(answer), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }),
  );
});

async function passwordStep(twoFactorChallenge?: string) {
  answers.push({
    message: "Um código de verificação foi enviado para este e-mail!",
    twoFactorVerification: true,
    ...(twoFactorChallenge ? { twoFactorChallenge } : {}),
  });

  return handleLoginUser(
    undefined,
    form({ email: EMAIL, password: "a-senha-certa" }),
  );
}

describe("the password step", () => {
  it("keeps the challenge in an HttpOnly cookie, and not in what the browser gets", async () => {
    const result = await passwordStep("desafio-1");

    expect(result).toEqual({ twoFactor: true, twoFactorEmail: EMAIL });
    expect(JSON.stringify(result)).not.toContain("desafio-1");

    const cookie = [...jar.entries()].find(
      ([, stored]) => stored.value === "desafio-1",
    );

    expect(cookie).toBeDefined();
    expect(cookie![1].options).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
    });
    expect(cookie![1].options!.maxAge).toBeLessThanOrEqual(30 * 60);
  });

  it("against an API that sends none, writes nothing", async () => {
    await passwordStep();

    expect(jar.size).toBe(0);
  });
});

describe("the code step", () => {
  it("sends the challenge back with the code, then forgets it", async () => {
    await passwordStep("desafio-1");

    answers.push({
      message: "Autenticação de dois fatores bem-sucedida!",
      token: "t",
      refresh_token: "r",
      role: "BUSINESS_ADMIN",
    });

    await handleTwoFactorAuthenticationUser(
      undefined,
      form({ email: EMAIL, code: "123456" }),
    );

    expect(sent.at(-1)!.url).toMatch(/\/user\/two-factor-verification$/);
    expect(sent.at(-1)!.body).toMatchObject({
      email: EMAIL,
      code: "123456",
      challenge: "desafio-1",
    });

    expect([...jar.values()].map((stored) => stored.value)).not.toContain(
      "desafio-1",
    );
  });

  it("without a challenge, sends exactly the old body", async () => {
    answers.push({
      message: "Autenticação de dois fatores bem-sucedida!",
      token: "t",
      refresh_token: "r",
      role: "BUSINESS_ADMIN",
    });

    await handleTwoFactorAuthenticationUser(
      undefined,
      form({ email: EMAIL, code: "123456" }),
    );

    expect(sent.at(-1)!.body).toEqual({ email: EMAIL, code: "123456" });
  });
});

describe("asking for another code", () => {
  it("sends the challenge along", async () => {
    await passwordStep("desafio-1");

    await handleResendTwoFactorCode(EMAIL);

    expect(sent.at(-1)!.url).toMatch(/\/user\/resend-two-factor-code$/);
    expect(sent.at(-1)!.body).toEqual({ email: EMAIL, challenge: "desafio-1" });
  });

  it("without a challenge, sends exactly the old body", async () => {
    await handleResendTwoFactorCode(EMAIL);

    expect(sent.at(-1)!.body).toEqual({ email: EMAIL });
  });
});
