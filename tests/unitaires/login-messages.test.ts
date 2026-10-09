import { describe, expect, it, vi } from "vitest";

// `@/socket` opens a socket.io client at import time; force-logout reaches it
// through clear-session-state.
vi.mock("@/socket", () => ({
  disconnectSocket: vi.fn(),
  socket: { connected: false, on: vi.fn(), off: vi.fn(), emit: vi.fn() },
}));

import {
  LOGIN_MESSAGES,
  loginMessageFor,
} from "@/components/auth/login-form/login-messages";
import { REASON_TO_COPY } from "@/lib/force-logout";

/**
 * What the login page says after a session ended (`/login?reason=…`).
 *
 * A forced logout names its reason; the middleware turns it into `reason`
 * and this page shows the matching message. A reason without a message
 * lands on a login page that says nothing about why the person is there.
 */
describe("the login page messages", () => {
  it("each forced sign-out reason has its own message", () => {
    const missing = Object.keys(REASON_TO_COPY).filter(
      (reason) => !(reason in LOGIN_MESSAGES),
    );

    expect(missing).toEqual([]);
  });

  // The API ends the session with a company-level code when the company is
  // switched off (AUTH_BUSINESS_INACTIVE, TENANT_INACTIVE) and with
  // 'role_changed' when role, company or linked driver change: each one
  // reads as itself, not as "acesso revogado" or "sessão expirada".
  it("says the company was deactivated, not that the access was revoked", () => {
    const message = LOGIN_MESSAGES.business_inactive;

    expect(message?.type).toBe("error");
    expect(message?.text).toMatch(/empresa/i);
    expect(message?.text).toMatch(/desativada/i);
    expect(message?.text).not.toBe(LOGIN_MESSAGES.user_revoked.text);
  });

  it("says the access changed when the role, company or driver changes", () => {
    const message = LOGIN_MESSAGES.role_changed;

    expect(message?.type).toBe("error");
    expect(message?.text).toMatch(/acesso foi alterado/i);
    expect(message?.text).not.toBe(LOGIN_MESSAGES.session_expired.text);
  });

  it("says the driver's branch was deactivated, not that the account was deleted", () => {
    const message = LOGIN_MESSAGES.branch_inactive;

    expect(message?.type).toBe("error");
    expect(message?.text).toMatch(/filial/i);
    expect(message?.text).not.toBe(LOGIN_MESSAGES.access_denied.text);
  });

  it("finds no message under a name the object inherits", () => {
    // `?reason=constructor` passed `reason in LOGIN_MESSAGES` and the page
    // toasted the Object constructor's missing text.
    expect(loginMessageFor("constructor")).toBeNull();
    expect(loginMessageFor("__proto__")).toBeNull();
    expect(loginMessageFor("toString")).toBeNull();
    expect(loginMessageFor(null)).toBeNull();
    expect(loginMessageFor("role_changed")).toBe(LOGIN_MESSAGES.role_changed);
  });

  it("only the sign-out through the button is a success message", () => {
    const successes = Object.entries(LOGIN_MESSAGES)
      .filter(([, message]) => message.type === "success")
      .map(([reason]) => reason);

    expect(successes).toEqual(["logout"]);
  });
});
