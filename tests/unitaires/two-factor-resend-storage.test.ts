import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The 2FA "reenviar código" cooldown in localStorage (PUB-27).
 *
 * The key was `lastResendTime-<e-mail>`: the account's e-mail in the name of
 * an entry that outlives the logout, readable by anyone who opens the
 * browser's storage, on a shared dispatch computer too. The cooldown only
 * needs a time; the e-mail bought nothing.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

const resend = vi.hoisted(() => vi.fn());

// The server action is the network boundary; what is proven is what the
// hook keeps in the browser around it.
vi.mock("@/actions/user/resend-two-factor-code", () => ({
  handleResendTwoFactorCode: resend,
}));

import { useTwoFactorForm } from "@/components/auth/two-factor-authentication-form/hooks";

(globalThis as { React?: typeof React }).React = React;

const EMAIL = "ana.souza@transportes.com.br";

type Hook = ReturnType<typeof useTwoFactorForm>;

let root: Root | null = null;
let current: Hook;

const Harness = ({ email }: { email: string }) => {
  current = useTwoFactorForm(email);
  return null;
};

async function mount(email = EMAIL) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  await act(async () => {
    root!.render(createElement(Harness, { email }));
  });
}

async function unmount() {
  await act(async () => root?.unmount());
  root = null;
}

function storedEntries(): Array<[string, string]> {
  return Array.from({ length: localStorage.length }, (_, index) => {
    const key = localStorage.key(index)!;
    return [key, localStorage.getItem(key) ?? ""];
  });
}

beforeEach(() => {
  localStorage.clear();
  resend.mockReset();
  resend.mockResolvedValue({ successMessage: "Código reenviado." });
});

afterEach(async () => {
  await unmount();
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("the two-step code resend interval", () => {
  it("does not store the account's e-mail in the browser, neither in the key nor in the value", async () => {
    await mount();

    await act(async () => {
      await current.handleResendCode();
    });

    expect(resend).toHaveBeenCalledWith(EMAIL);
    expect(current.resendTimer).toBe(10);

    const entries = storedEntries();

    expect(entries.length).toBeGreaterThan(0);
    for (const [key, value] of entries) {
      expect(key).not.toContain(EMAIL);
      expect(value).not.toContain(EMAIL);
      expect(key).not.toMatch(/@/);
    }
  });

  it("erases the old entries that carried the e-mail in their name", async () => {
    localStorage.setItem(`lastResendTime-${EMAIL}`, String(Date.now()));
    localStorage.setItem(
      "lastResendTime-outra.pessoa@empresa.com",
      String(Date.now() - 60_000),
    );
    localStorage.setItem("theme", "dark");

    await mount();

    expect(storedEntries().map(([key]) => key)).toEqual(["theme"]);
  });

  it("still respects the interval after a page reload", async () => {
    await mount();

    await act(async () => {
      await current.handleResendCode();
    });

    await unmount();
    await mount();

    expect(current.resendTimer).toBeGreaterThan(8);
    expect(current.resendTimer).toBeLessThanOrEqual(10);
  });

  it("works with storage blocked (private window, site data blocked)", async () => {
    const blocked = () => {
      throw new DOMException("blocked", "SecurityError");
    };

    vi.stubGlobal("localStorage", {
      getItem: blocked,
      setItem: blocked,
      removeItem: blocked,
      key: blocked,
      clear: blocked,
      get length(): number {
        return blocked();
      },
    });

    expect(() => localStorage.getItem("x")).toThrow();

    await mount();

    await act(async () => {
      await current.handleResendCode();
    });

    // The code was resent and the timer still runs for this page.
    expect(resend).toHaveBeenCalledTimes(1);
    expect(current.resendTimer).toBe(10);
  });
});
