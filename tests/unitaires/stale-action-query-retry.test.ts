// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { QueryObserver, setLogger } from "react-query";

// The failures below are the point; react-query need not print each one.
setLogger({
  log: () => undefined,
  warn: () => undefined,
  error: () => undefined,
});

import { STALE_ACTION_MESSAGE, isStaleActionResult } from "@/lib/action-result";
import {
  isTransientQueryError,
  queryClientProps,
} from "@/lib/query-client-props";
import { RelayReadError } from "@/lib/relay-read";

/**
 * A query whose Server Action is gone from the server's build.
 *
 * The screens' queries throw STALE_ACTION_MESSAGE on that answer, so
 * react-query keeps the last data instead of blanking the screen. The app's
 * query client retries every error without a 4xx status three times, with
 * one, two and four seconds between them: an answer that can never change
 * cost four requests and held the screen on its spinner for seven seconds
 * before it could say anything. The control tower does that on every poll.
 */
const staleQuery = (action: () => Promise<unknown>) => async () => {
  const answer = await action();

  if (isStaleActionResult(answer, { background: true })) {
    throw new Error(STALE_ACTION_MESSAGE);
  }

  return answer;
};

describe("the app's query client and a stale action", () => {
  it("does not ask the server again for an action it no longer has", async () => {
    const action = vi.fn(async () => undefined);

    await expect(
      queryClientProps.fetchQuery(["stale-action-probe"], staleQuery(action), {
        retryDelay: 0,
      }),
    ).rejects.toThrow(STALE_ACTION_MESSAGE);

    expect(
      action,
      "a resposta de build antigo foi pedida de novo",
    ).toHaveBeenCalledTimes(1);
  });

  it("does not retry a refusal a screen threw from an action's answer", async () => {
    const action = vi.fn(async () => {
      throw new Error("Sem permissão.");
    });

    await expect(
      queryClientProps.fetchQuery(["refusal-probe"], action, {
        retryDelay: 0,
      }),
    ).rejects.toThrow("Sem permissão.");

    expect(action).toHaveBeenCalledTimes(1);
  });
});

/**
 * What the client retries now that screen reads go through the relay and
 * fail with a real status (lib/relay-read).
 *
 * It used to retry anything without a 4xx status three times, one + two +
 * four seconds apart, and an action's refusal never had a status: a failed
 * read held its spinner ~7 s, and while it did it held Next's one-at-a-time
 * Server Action queue for every other read of the page.
 */
describe("the app's query client and a failed read", () => {
  const failing = (error: unknown) => vi.fn(async () => Promise.reject(error));

  async function attempts(key: string, read: () => Promise<unknown>) {
    await queryClientProps
      .fetchQuery([key], read, { retryDelay: 0 })
      .catch(() => undefined);
  }

  it.each([
    ["nothing answered", new RelayReadError({ message: "x", status: null })],
    ["a 503", new RelayReadError({ message: "x", status: 503 })],
    ["fetch's own network failure", new TypeError("Failed to fetch")],
  ])("asks once more, and only once, when %s", async (_label, error) => {
    const read = failing(error);

    await attempts(`transient-${String(_label)}`, read);

    expect(read).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["a 400", 400],
    ["a 401", 401],
    ["a 403", 403],
    ["a 404", 404],
    ["a 429", 429],
  ])("never asks again after %s", async (_label, status) => {
    const read = failing(new RelayReadError({ message: "x", status }));

    await attempts(`refused-${status}`, read);

    expect(read).toHaveBeenCalledTimes(1);
  });

  it("waits one second, not one + two + four", () => {
    const { retryDelay } = queryClientProps.getDefaultOptions().queries ?? {};

    expect(retryDelay).toBe(1000);
  });

  it("names which errors are transient", () => {
    expect(isTransientQueryError(new Error(STALE_ACTION_MESSAGE))).toBe(false);
    expect(isTransientQueryError({ status: 502 })).toBe(true);
    expect(isTransientQueryError({ status: 422 })).toBe(false);
    expect(isTransientQueryError(null)).toBe(false);
  });
});

/**
 * A query keyed by company never shows the previous company's rows under the
 * new key while that one loads (decision 2.6). `keepPreviousData` is off by
 * default; a paged list opts in and is remounted per company.
 */
describe("the app's query client and a company switch", () => {
  it("shows nothing of company A while company B loads", async () => {
    const observer = new QueryObserver(queryClientProps, {
      queryKey: ["company-switch-probe", "company-a"],
      queryFn: async () => ["row of A"],
    });

    const unsubscribe = observer.subscribe(() => undefined);

    await vi.waitFor(() =>
      expect(observer.getCurrentResult().data).toEqual(["row of A"]),
    );

    let release: (rows: string[]) => void = () => undefined;

    observer.setOptions({
      queryKey: ["company-switch-probe", "company-b"],
      queryFn: () => new Promise<string[]>((done) => (release = done)),
    });

    expect(observer.getCurrentResult().data).toBeUndefined();
    expect(observer.getCurrentResult().isPreviousData).toBe(false);

    release(["row of B"]);

    await vi.waitFor(() =>
      expect(observer.getCurrentResult().data).toEqual(["row of B"]),
    );

    unsubscribe();
  });
});
