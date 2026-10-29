import * as React from "react";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider, useQuery } from "react-query";

import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

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
import { queryClientProps } from "@/lib/query-client-props";
import { useAuthStore } from "@/store/auth-store";

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

  // happy-dom refuses a real navigation; where the tab goes is under test,
  // whichever way the code navigates.
  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      get href() {
        return assigned[assigned.length - 1] ?? "";
      },
      set href(value: string) {
        assigned.push(value);
      },
      assign(value: string) {
        assigned.push(value);
      },
    },
  });
});

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal("React", React);
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
      expect(REASON_TO_COPY[reason].description.length, reason).toBeGreaterThan(
        15,
      );
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

  it("says a company switched off as the company's state, not as a revoked access", () => {
    // Decision 4.1: an inactive company (AUTH_BUSINESS_INACTIVE /
    // TENANT_INACTIVE) is not something done to this person's own access.
    const copy = (
      REASON_TO_COPY as Record<string, { title: string; description: string }>
    ).business_inactive;

    expect(copy?.title).toBe("Empresa desativada");
    expect(copy?.description).toMatch(/empresa/i);
    expect(copy?.title).not.toBe(REASON_TO_COPY.user_revoked.title);
  });

  it("says a changed role, company or linked driver as that, not as new permissions", () => {
    // USR-EDIT-1 / decision 4.6: the API ends the session on purpose. The
    // overlay used to borrow permissions_changed ("Suas permissões mudaram").
    const copy = (
      REASON_TO_COPY as Record<string, { title: string; description: string }>
    ).role_changed;

    expect(copy?.title).toBe("Seu acesso foi alterado");
    expect(copy?.description).toMatch(/nível de acesso, empresa ou motorista/i);
    expect(copy?.title).not.toBe(REASON_TO_COPY.permissions_changed.title);
  });

  it("says a driver's branch switched off as the branch's state, not a deleted account", () => {
    // AUTH_BRANCH_INACTIVE fell into access_denied ("Acesso não autorizado").
    const copy = (
      REASON_TO_COPY as Record<string, { title: string; description: string }>
    ).branch_inactive;

    expect(copy?.title).toBe("Filial desativada");
    expect(copy?.title).not.toBe(REASON_TO_COPY.access_denied.title);
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

describe("what the kicked-out user leaves in the tab", () => {
  it("has nothing persisted by the time the redirect leaves", () => {
    // The hard navigation drops memory, but not localStorage: the role and
    // permissions persisted by the auth store stayed until some login page
    // mounted — and a tab closed during the overlay never got there.
    useAuthStore.getState().setAuth({
      id: "user-a",
      businessId: "biz-1",
      role: "BUSINESS_ADMIN",
      permissions: [],
      enabledModules: ["DELIVERIES"],
    });

    forceLogout("user_revoked");

    // Past the overlay's delay only: running every timer would also fire the
    // cache's 30-minute garbage collection and prove nothing.
    vi.advanceTimersByTime(1_000);

    expect(assigned).toHaveLength(1);
    expect(localStorage.getItem("auth-store") ?? "").not.toContain(
      "BUSINESS_ADMIN",
    );
  });

  /**
   * The overlay only covers the screen: the protected tree stays mounted
   * behind it until the document goes. Emptying the cache and resetting the
   * auth store there (the first cut) made that tree re-render, rebuild its
   * queries and send them again with the session already dead.
   */
  it("does not make the screen it is leaving ask the API again", async () => {
    vi.useRealTimers();

    useAuthStore.getState().setAuth({
      id: "user-a",
      businessId: "biz-1",
      role: "BUSINESS_ADMIN",
      permissions: [],
      enabledModules: ["DELIVERIES"],
    });

    let requests = 0;

    // A role-gated screen reading a list: most screens behind the overlay.
    const Panel = () => {
      const role = useAuthStore((state) => state.role);

      useQuery(["shipper", "biz-1"], async () => {
        requests += 1;
        return [{ id: "s1" }];
      });

      return createElement("span", null, role ?? "");
    };

    const root = createRoot(document.createElement("div"));

    await act(async () => {
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClientProps },
          createElement(Panel),
        ),
      );
    });
    await act(async () => {
      await new Promise((done) => setTimeout(done, 30));
    });
    expect(requests).toBe(1);

    forceLogout("session_expired");

    // Past the overlay's delay, with the navigation done.
    await act(async () => {
      await new Promise((done) => setTimeout(done, 600));
    });

    expect(assigned).toEqual([
      "/login?error=session_expired&force_logout=true",
    ]);
    expect(
      requests,
      "a tela atrás do overlay refez a consulta com a sessão encerrada",
    ).toBe(1);

    await act(async () => root.unmount());
    queryClientProps.clear();
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
