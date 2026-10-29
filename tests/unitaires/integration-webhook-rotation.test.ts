import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Changing a webhook's signing secret from the screen.
 *
 * The only way to change a leaked secret used to be deleting the endpoint —
 * and its whole delivery history with it. The API now rotates it (the old one
 * keeps signing beside the new one for 24 hours); the panel offers it per
 * endpoint and shows the new secret once, like at creation.
 */
vi.mock("@/actions/cookies", () => ({
  getCookies: vi.fn(async (name: string) =>
    name === "tkey" ? "tok-abc" : undefined,
  ),
}));

const calls: Array<{ url: string; init?: RequestInit }> = [];

let answer: () => Response;

beforeEach(() => {
  calls.length = 0;

  vi.stubEnv("HTTP_REQUEST", "https://api.exemplo");

  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      return answer();
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const source = (path: string) =>
  readFileSync(resolve(process.cwd(), "src", path), "utf8");

describe("the rotate action", () => {
  it("posts to the endpoint's rotate route and hands back the new secret", async () => {
    answer = () =>
      new Response(
        JSON.stringify({
          message: "Novo segredo gerado.",
          data: { id: "wh-1", secret: "whsec_novo" },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );

    const { rotateWebhookSecret } = await import("@/actions/integration");

    const result = await rotateWebhookSecret("biz-1", "wh-1");

    expect(calls[0].url).toBe(
      "https://api.exemplo/integrations/webhook-endpoint/wh-1/business/biz-1/rotate-secret",
    );
    expect(calls[0].init?.method).toBe("POST");
    expect(result).toMatchObject({
      success: true,
      data: { id: "wh-1", secret: "whsec_novo" },
    });
  });

  it("passes the API's refusal through", async () => {
    answer = () =>
      new Response(JSON.stringify({ message: "Endpoint não encontrado." }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });

    const { rotateWebhookSecret } = await import("@/actions/integration");

    // With the status (and the API's code, when it sends one), so a screen
    // can tell a missing endpoint from a refusal of access (decision 4.1).
    expect(await rotateWebhookSecret("biz-1", "wh-1")).toEqual({
      success: false,
      message: "Endpoint não encontrado.",
      status: 404,
    });
  });
});

describe("the webhooks panel", () => {
  it("offers the rotation per endpoint, through a dialog that shows the secret once", () => {
    const panel = source("features/integrations/webhooks/panel.tsx");

    expect(panel).toContain("RotateSecretDialog");
    expect(panel).toContain("Gerar novo segredo");

    const dialog = source(
      "features/integrations/webhooks/rotate-secret-dialog/index.tsx",
    );

    expect(dialog).toContain("rotateWebhookSecret");

    // The grace period is what makes it safe to press: said before, not after.
    expect(dialog).toMatch(/24 horas/);
  });
});
