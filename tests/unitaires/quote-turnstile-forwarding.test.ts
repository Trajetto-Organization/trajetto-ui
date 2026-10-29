import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The public quote form's Turnstile token, and who checks it (INJ-03).
 *
 * The check used to live only in this server action, so a bot posting
 * straight to the API skipped it. The API now verifies the token itself, and
 * that forces this action to stop verifying: a Turnstile token is single-use,
 * and a second siteverify of the same token fails — the API would refuse
 * every genuine request.
 *
 * So the action forwards the token untouched and never calls Cloudflare.
 */
const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const calls: Array<{ url: string; body: string }> = [];

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

const QUOTE = {
  name: "Maria Souza",
  company: "Frota Boa",
  email: "maria@exemplo.com.br",
  telephone: "11999999999",
  fleet_size: "1-5",
  message: "",
};

beforeEach(() => {
  calls.length = 0;

  vi.stubEnv("HTTP_REQUEST", "https://api.exemplo");

  // Production is where the old action verified the token itself.
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("TURNSTILE_SECRET_KEY", "0x-test-secret");

  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url: String(url), body: String(init?.body ?? "") });

      if (String(url) === SITEVERIFY) {
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }

      return new Response(
        JSON.stringify({ message: "Orçamento solicitado com sucesso!" }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("submitting the quote form", () => {
  it("does not verify the token itself, so the API's verification can succeed", async () => {
    const { handleQuoteSubmit } = await import("@/actions/quote/create-quote");

    await handleQuoteSubmit({}, form({ ...QUOTE, turnstileToken: "tok-123" }));

    expect(calls.map((call) => call.url)).not.toContain(SITEVERIFY);
  });

  it("forwards the token to the API with the quote", async () => {
    const { handleQuoteSubmit } = await import("@/actions/quote/create-quote");

    const result = await handleQuoteSubmit(
      {},
      form({ ...QUOTE, turnstileToken: "tok-123" }),
    );

    const toApi = calls.find((call) =>
      call.url.endsWith("/quote/create-quote"),
    );

    expect(toApi).toBeDefined();
    expect(JSON.parse(toApi!.body)).toMatchObject({
      email: QUOTE.email,
      turnstileToken: "tok-123",
    });

    expect(result).toMatchObject({ successMessage: expect.any(String) });
  });

  it("sends no token field when the widget produced none, and lets the API decide", async () => {
    const { handleQuoteSubmit } = await import("@/actions/quote/create-quote");

    await handleQuoteSubmit({}, form(QUOTE));

    const toApi = calls.find((call) =>
      call.url.endsWith("/quote/create-quote"),
    );

    expect(toApi).toBeDefined();
    expect(JSON.parse(toApi!.body)).not.toHaveProperty("turnstileToken");
  });
});
