import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  canShowBrowserNotification,
  showBrowserNotification,
} from "@/lib/browser-notification";

/**
 * The system notification of a realtime push.
 *
 * iOS Safari has no `Notification` in a tab, and the provider's socket setup
 * threw a ReferenceError into its catch — a false "Não foi possível se
 * conectar ao serviço de notificações" toast on every iPhone. Android Chrome
 * throws a TypeError from the constructor. And the provider asked for
 * permission on load, with no user gesture.
 */
const original = (window as { Notification?: unknown }).Notification;

afterEach(() => {
  (window as { Notification?: unknown }).Notification = original;
  vi.restoreAllMocks();
});

function installNotification(permission: string, construct?: () => void) {
  const Fake = vi.fn(function FakeNotification() {
    construct?.();
  }) as unknown as { permission: string };
  Fake.permission = permission;
  (window as { Notification?: unknown }).Notification = Fake;

  return Fake as unknown as ReturnType<typeof vi.fn>;
}

describe("showBrowserNotification", () => {
  it("is skipped where the browser has no Notification (iOS Safari)", () => {
    delete (window as { Notification?: unknown }).Notification;

    expect(canShowBrowserNotification()).toBe(false);
    expect(() => showBrowserNotification("Título", "Mensagem")).not.toThrow();
  });

  it("is skipped when the constructor throws (Android Chrome)", () => {
    installNotification("granted", () => {
      throw new TypeError("Illegal constructor");
    });

    expect(showBrowserNotification("Título", "Mensagem")).toBe(false);
  });

  it("is skipped until the person grants permission", () => {
    const Fake = installNotification("default");

    expect(showBrowserNotification("Título", "Mensagem")).toBe(false);
    expect(Fake).not.toHaveBeenCalled();
  });

  it("shows the notification once permission is granted", () => {
    const Fake = installNotification("granted");

    expect(showBrowserNotification("Título", "Mensagem")).toBe(true);
    expect(Fake).toHaveBeenCalledWith("Título", {
      body: "Mensagem",
      icon: "/favicon.ico",
    });
  });
});

describe("the notifications provider", () => {
  const source = readFileSync(
    resolve(
      process.cwd(),
      "src/app/(protected)/_components/layout/protected-provider/notifications-provider/index.tsx",
    ),
    "utf8",
  );

  it("never asks for permission by itself", () => {
    expect(source).not.toMatch(/Notification\.requestPermission/);
  });

  it("goes through the guarded helper for system notifications", () => {
    expect(source).not.toMatch(/new Notification\(|Notification\.permission/);
    expect(source).toContain("showBrowserNotification(");
  });
});
