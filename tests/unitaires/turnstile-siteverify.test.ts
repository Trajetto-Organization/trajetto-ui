// @vitest-environment node
import { spawn, type ChildProcess } from "node:child_process";
import { resolve } from "node:path";

import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { validateTurnstile } from "@/actions/validate-turnstile";
import {
  CLOUDFLARE_SITEVERIFY,
  isTurnstileTestSecret,
  turnstileSiteverifyUrl,
} from "@/lib/turnstile-siteverify";

/**
 * Where the login's captcha token is checked, and the one door the browser
 * suites use.
 *
 * Every login of the suites asked Cloudflare's siteverify over the internet,
 * so the gate failed when Cloudflare was slow — no defect anywhere. The suites
 * now point the server at a local double (TURNSTILE_SITEVERIFY_URL). That
 * variable must never become a way around the captcha: only Cloudflare's
 * published TEST secrets may use it, only towards a loopback address, and a
 * real secret always goes to Cloudflare whatever the variable says.
 */
const PASS_SECRET = "1x0000000000000000000000000000000AA";
const FAIL_SECRET = "2x0000000000000000000000000000000AA";
const SPENT_SECRET = "3x0000000000000000000000000000000AA";

// Not a test secret: what a deployment holds (an obviously fake value).
const REAL_SECRET = "0x-production-secret-not-a-test-key";

const DUMMY_TOKEN = "XXXX.DUMMY.TOKEN.XXXX";

const LOCAL_DOUBLE = "http://127.0.0.1:3199/turnstile/v0/siteverify";

describe("the siteverify address", () => {
  it("is Cloudflare's for a real secret, even with a local double configured", () => {
    expect(turnstileSiteverifyUrl(REAL_SECRET, LOCAL_DOUBLE)).toBe(
      CLOUDFLARE_SITEVERIFY,
    );
    expect(
      turnstileSiteverifyUrl(
        REAL_SECRET,
        "http://localhost:3199/turnstile/v0/siteverify",
      ),
    ).toBe(CLOUDFLARE_SITEVERIFY);
  });

  it("is the local double for a test secret", () => {
    for (const secret of [PASS_SECRET, FAIL_SECRET, SPENT_SECRET]) {
      expect(turnstileSiteverifyUrl(secret, LOCAL_DOUBLE)).toBe(LOCAL_DOUBLE);
    }

    expect(turnstileSiteverifyUrl(PASS_SECRET, "http://localhost:3199/x")).toBe(
      "http://localhost:3199/x",
    );
    expect(turnstileSiteverifyUrl(PASS_SECRET, "http://[::1]:3199/x")).toBe(
      "http://[::1]:3199/x",
    );
  });

  it("never sends even a test secret to a host that is not this machine", () => {
    for (const override of [
      "https://siteverify.example.com/turnstile/v0/siteverify",
      "http://localhost.example.com/turnstile/v0/siteverify",
      "http://intranet/turnstile/v0/siteverify",
      "ftp://localhost/turnstile/v0/siteverify",
      "file:///etc/hosts",
    ]) {
      expect(turnstileSiteverifyUrl(PASS_SECRET, override), override).toBe(
        CLOUDFLARE_SITEVERIFY,
      );
    }
  });

  it("is Cloudflare's when the variable is empty or not a URL", () => {
    for (const override of [undefined, "", "   ", "não é uma url", "//x"]) {
      expect(turnstileSiteverifyUrl(PASS_SECRET, override)).toBe(
        CLOUDFLARE_SITEVERIFY,
      );
    }
  });

  it("recognises only Cloudflare's published test secrets", () => {
    expect(isTurnstileTestSecret(PASS_SECRET)).toBe(true);
    expect(isTurnstileTestSecret(FAIL_SECRET)).toBe(true);
    expect(isTurnstileTestSecret(SPENT_SECRET)).toBe(true);

    for (const secret of [
      REAL_SECRET,
      "4x0000000000000000000000000000000AA",
      "1x000000000000000000000000000000AA",
      "1x00000000000000000000000000000000AA",
      ` ${PASS_SECRET}`,
      `${PASS_SECRET}\n`,
      // The SITE key is not the secret.
      "1x00000000000000000000AA",
      "",
    ]) {
      expect(isTurnstileTestSecret(secret), JSON.stringify(secret)).toBe(false);
    }
  });
});

describe("validateTurnstile, end to end", () => {
  let double: ChildProcess | null = null;
  let port = 0;

  beforeAll(async () => {
    double = spawn(
      process.execPath,
      [resolve("tests/ui/support/turnstile-siteverify-double.mjs")],
      {
        env: { ...process.env, E2E_DOUBLES_PORT: "0" },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    port = await new Promise<number>((done, fail) => {
      const timer = setTimeout(
        () => fail(new Error("o dublê do siteverify não subiu")),
        10_000,
      );

      double!.stdout!.on("data", (chunk: Buffer) => {
        const found = /listening on (\d+)/.exec(String(chunk));

        if (found) {
          clearTimeout(timer);
          done(Number(found[1]));
        }
      });
      double!.on("exit", (code) => fail(new Error(`saiu com ${code}`)));
    });
  });

  afterAll(() => {
    double?.kill();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const siteverify = () => `http://127.0.0.1:${port}/turnstile/v0/siteverify`;

  const stats = async () =>
    (await (await fetch(`http://127.0.0.1:${port}/stats`)).json()) as {
      verifications: number;
    };

  it("asks Cloudflare, not the double, with a real secret", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", REAL_SECRET);
    vi.stubEnv("TURNSTILE_SITEVERIFY_URL", siteverify());

    const before = (await stats()).verifications;
    const asked: string[] = [];

    // The refusal is logged; expected here.
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        asked.push(String(input));

        return new Response(JSON.stringify({ success: false }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }),
    );

    await validateTurnstile(DUMMY_TOKEN);

    vi.unstubAllGlobals();

    expect(asked).toEqual([CLOUDFLARE_SITEVERIFY]);
    expect((await stats()).verifications).toBe(before);
  });

  it("passes the dummy token through the double with the always-pass test secret", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", PASS_SECRET);
    vi.stubEnv("TURNSTILE_SITEVERIFY_URL", siteverify());

    const before = (await stats()).verifications;

    expect(await validateTurnstile(DUMMY_TOKEN)).toBe(true);
    expect((await stats()).verifications).toBe(before + 1);
  });

  it("refuses what Cloudflare refuses for its test secrets", async () => {
    vi.stubEnv("TURNSTILE_SITEVERIFY_URL", siteverify());
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    vi.stubEnv("TURNSTILE_SECRET_KEY", PASS_SECRET);
    expect(await validateTurnstile("a-token-nobody-issued")).toBe(false);

    vi.stubEnv("TURNSTILE_SECRET_KEY", FAIL_SECRET);
    expect(await validateTurnstile(DUMMY_TOKEN)).toBe(false);

    vi.stubEnv("TURNSTILE_SECRET_KEY", SPENT_SECRET);
    expect(await validateTurnstile(DUMMY_TOKEN)).toBe(false);

    expect(await validateTurnstile(null)).toBe(false);
  });
});
