// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { STALE_ACTION_MESSAGE, isStaleActionResult } from "@/lib/action-result";
import { queryClientProps } from "@/lib/query-client-props";

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

  it("still retries every other failure as before", async () => {
    const action = vi.fn(async () => {
      throw new Error("fetch failed");
    });

    await expect(
      queryClientProps.fetchQuery(["transient-failure-probe"], action, {
        retryDelay: 0,
      }),
    ).rejects.toThrow("fetch failed");

    expect(action).toHaveBeenCalledTimes(4);
  });
});
