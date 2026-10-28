// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `apiFetch` (every Server Action's call to the API, and the page reads that
 * go through it) had no timeout: a slow API held the action, its memory and
 * the person's spinner until undici gave up at five minutes, and then said
 * "erro inesperado". Now a read waits 10 s and a write 60 s, and a timeout is
 * an answer with a sentence — a write's saying the outcome is unknown.
 */
const revalidatePath = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({ revalidatePath }));

import {
  API_TIMEOUT_CODE,
  READ_TIMEOUT_MS,
  WRITE_TIMEOUT_MS,
  apiFetch,
} from "@/lib/api-fetch";

/** Stands in for AbortSignal.timeout: records the delay, fires on demand. */
let requested: number[] = [];
let controllers: AbortController[] = [];

beforeEach(() => {
  requested = [];
  controllers = [];
  revalidatePath.mockReset();

  vi.spyOn(AbortSignal, "timeout").mockImplementation((ms: number) => {
    const controller = new AbortController();

    requested.push(ms);
    controllers.push(controller);

    return controller.signal;
  });

  // An API that answers only when the signal fires — by failing, as undici
  // does on an abort.
  vi.stubGlobal(
    "fetch",
    vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(
              new DOMException("The operation timed out.", "TimeoutError"),
            ),
          );
        }),
    ),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function timedOut(init?: RequestInit) {
  const pending = apiFetch("http://api.test/x", init);

  await Promise.resolve();
  controllers.at(-1)?.abort();

  return pending;
}

describe("apiFetch without a signal of its own", () => {
  it("gives a read 10 s and answers a timeout with a sentence", async () => {
    const response = await timedOut({
      method: "GET",
      headers: { Authorization: "Bearer t" },
    });

    expect(requested).toEqual([READ_TIMEOUT_MS]);
    expect(READ_TIMEOUT_MS).toBe(10_000);
    expect(response.status).toBe(504);

    const body = (await response.json()) as { code: string; message: string };

    expect(body.code).toBe(API_TIMEOUT_CODE);
    expect(body.message).toMatch(/demorou para responder/);
  });

  it("gives a write 60 s and says its outcome is unknown", async () => {
    const response = await timedOut({
      method: "POST",
      headers: { Authorization: "Bearer t" },
      body: "{}",
    });

    expect(requested).toEqual([WRITE_TIMEOUT_MS]);
    expect(WRITE_TIMEOUT_MS).toBe(60_000);

    const body = (await response.json()) as { message: string };

    expect(body.message).toMatch(/pode ter sido concluída/);
  });

  it("never reads a timeout as the session ending", async () => {
    await timedOut({ headers: { Authorization: "Bearer t" } });

    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("apiFetch with the caller's own signal", () => {
  it("leaves it alone and lets its abort throw", async () => {
    const own = new AbortController();
    const pending = apiFetch("http://api.test/x", { signal: own.signal });

    own.abort();

    await expect(pending).rejects.toThrow();
    expect(requested).toEqual([]);
  });
});

describe("a failure that is not the timeout", () => {
  it("still throws, for the action's own catch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );

    await expect(apiFetch("http://api.test/x")).rejects.toThrow("fetch failed");
  });
});
