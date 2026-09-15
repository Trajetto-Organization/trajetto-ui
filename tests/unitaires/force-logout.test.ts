import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `@/socket` opens a real socket.io client at import time. This file is about
 * what the kick-out does, not about the transport, and the disconnect call is
 * one of the things being asserted — so it has to be observable.
 */
const disconnectSocket = vi.fn();

vi.mock("@/socket", () => ({
  disconnectSocket: () => disconnectSocket(),
}));

import {
  REASON_TO_COPY,
  forceLogout,
  useForceLogoutStore,
  type ForceLogoutReason,
} from "@/lib/force-logout";

/**
 * Being thrown out of the app, which has to be one deliberate motion.
 *
 * Seven different things end a session against the user's will — it expired,
 * an administrator revoked the account, the driver record went inactive, the
 * server could not be reached to confirm any of it. They arrive from three
 * unrelated places: a socket event, a failed fetch inside a hook, and a route
 * guard. None of them is in the component tree, and all of them can fire at
 * the same moment.
 *
 * What makes this worth pinning is that every failure here is invisible in a
 * code review and obvious to a user: a dashboard that quietly stops working
 * with no explanation, an overlay that says "sua sessão expirou" to somebody
 * who was actually blocked by their manager, or a redirect that lands back on
 * the dashboard because the cookie was never cleared.
 */
const REASONS = Object.keys(REASON_TO_COPY) as ForceLogoutReason[];

let assigned: string[] = [];

beforeEach(() => {
  vi.useFakeTimers();

  disconnectSocket.mockClear();
  assigned = [];

  useForceLogoutStore.setState({ reason: null });
  sessionStorage.clear();

  // happy-dom refuses a real navigation; the href is what is under test.
  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      get href() {
        return assigned[assigned.length - 1] ?? "";
      },
      set href(value: string) {
        assigned.push(value);
      },
    },
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("every way a session can end", () => {
  it("has its own words", () => {
    // The whole reason the vocabulary exists in one place: adding a reason in
    // the socket handler and forgetting the copy is how somebody deliberately
    // blocked by an administrator ends up reading "sua sessão expirou".
    const titles = REASONS.map((reason) => REASON_TO_COPY[reason].title);

    expect(new Set(titles).size, `títulos repetidos: ${titles}`).toBe(
      REASONS.length,
    );

    for (const reason of REASONS) {
      expect(REASON_TO_COPY[reason].title.length, reason).toBeGreaterThan(5);
      expect(
        REASON_TO_COPY[reason].description.length,
        reason,
      ).toBeGreaterThan(15);
    }
  });

  it("says what is happening now, not what to do about it", () => {
    // The overlay is read during the wait; the authoritative message lands on
    // the login page afterwards. Every description ends by saying a redirect
    // is in flight.
    for (const reason of REASONS) {
      expect(
        REASON_TO_COPY[reason].description.toLowerCase(),
        reason,
      ).toContain("redirecionando");
    }
  });
});

describe("being thrown out", () => {
  it("raises the overlay before anything else happens", () => {
    forceLogout("user_revoked");

    // Set synchronously, so the user sees a deliberate state instead of a
    // dashboard that has quietly stopped responding.
    expect(useForceLogoutStore.getState().reason).toBe("user_revoked");

    // And the redirect has NOT happened yet — the overlay needs to register.
    expect(assigned).toEqual([]);
  });

  it("closes the socket so nothing arrives against a dead session", () => {
    forceLogout("session_expired");

    expect(disconnectSocket).toHaveBeenCalledTimes(1);
  });

  it("leaves the login page a note to show the real message", () => {
    forceLogout("driver_inactive");

    expect(sessionStorage.getItem("pending_login_toast")).toBe("true");
  });

  it("redirects hard, carrying the reason and the flag that clears the cookie", () => {
    forceLogout("permissions_changed");

    vi.runAllTimers();

    expect(assigned).toHaveLength(1);

    const url = assigned[0];

    expect(url).toContain("/login");
    expect(url).toContain("error=permissions_changed");

    /**
     * `force_logout=true` is load-bearing, not decoration.
     *
     * It is what makes the middleware clear the cookies. Without it the
     * navigation lands on /login with `tkey` still in place and bounces the
     * user straight back into the dashboard they were just removed from —
     * a loop that looks like the app ignoring the revocation.
     */
    expect(url).toContain("force_logout=true");
  });
});

describe("two kicks at the same moment", () => {
  it("keeps the reason the user is already reading", () => {
    // A socket event and a failed fetch can both fire on the same tick. The
    // second must not rewrite the overlay under the user's eyes.
    forceLogout("user_revoked");
    forceLogout("session_expired");

    expect(useForceLogoutStore.getState().reason).toBe("user_revoked");
  });

  it("does not restart the redirect", () => {
    forceLogout("user_revoked");

    vi.advanceTimersByTime(200);

    forceLogout("session_expired");

    vi.runAllTimers();

    // One navigation, not two — and to the first reason. A second timer would
    // also mean the second call could land after the first had already left.
    expect(assigned).toHaveLength(1);
    expect(assigned[0]).toContain("error=user_revoked");
  });

  it("closes the socket once", () => {
    forceLogout("access_denied");
    forceLogout("access_denied");

    expect(disconnectSocket).toHaveBeenCalledTimes(1);
  });
});
