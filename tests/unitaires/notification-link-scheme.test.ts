import * as React from "react";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * Notification links, as rendered by the bell and by /notifications.
 *
 * Both render `notification.link` — a string that came from the API — straight
 * into an `href`. Today every policy builds it from a template
 * (`${baseUrl}/dashboard/...`), so nothing user-typed reaches it. The day one
 * policy, or a webhook payload, composes it from input, a `javascript:` link
 * runs in the dispatcher's session on a click. So the scheme is checked where
 * it is rendered, not trusted from where it was built.
 */
vi.mock("@/actions/notifications", () => ({
  handleMarkNotificationAsRead: async () => ({}),
  handleDeleteNotification: async () => ({}),
  handleMarkAllNotificationsAsRead: async () => ({}),
}));

// Both use react-dom's `useFormStatus`, which only Next's bundled react-dom
// has; they are beside the point here.
vi.mock(
  "@/app/(protected)/_components/notification-list/mark-read-button",
  () => ({
    MarkAsReadButton: () => null,
  }),
);
vi.mock(
  "@/app/(protected)/_components/notification-list/delete-notification-button",
  () => ({
    DeleteNotificationButton: () => null,
  }),
);

const context = vi.hoisted(() => ({
  notifications: [] as Array<Record<string, unknown>>,
}));

vi.mock(
  "@/app/(protected)/_components/layout/protected-provider/notifications-provider",
  () => ({
    useNotificationsContext: () => ({
      notifications: context.notifications,
      unreadCount: context.notifications.filter((n) => !n.read).length,
      connected: true,
      markNotificationAsRead: () => undefined,
      removeNotification: () => undefined,
      markAllNotificationsAsRead: () => undefined,
    }),
  }),
);

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;

  // The app's .tsx is compiled for Next's automatic runtime; esbuild here
  // emits the classic `React.createElement`, which needs React in scope.
  vi.stubGlobal("React", React);
});

const HOSTILE = [
  "javascript:alert(document.cookie)",
  " JavaScript:alert(1)",
  "java\tscript:alert(1)",
  "\njavascript:alert(1)",
  "data:text/html,<script>alert(1)</script>",
  "vbscript:msgbox(1)",
  "//evil.example/phish",
  "/\\evil.example/phish",
  "/\t/evil.example/phish",
];

describe("safeNotificationHref", () => {
  it("drops every scheme that can run script, and links that leave the app by trickery", async () => {
    const { safeNotificationHref } = await import("@/lib/safe-href");

    for (const link of HOSTILE) {
      expect(safeNotificationHref(link), JSON.stringify(link)).toBeNull();
    }

    expect(safeNotificationHref(undefined)).toBeNull();
    expect(safeNotificationHref("")).toBeNull();
    expect(safeNotificationHref("   ")).toBeNull();
  });

  it("keeps what the API sends today", async () => {
    const { safeNotificationHref } = await import("@/lib/safe-href");

    // Every policy builds `${env.HTTP_REQUEST}/...`: https in production,
    // http://localhost in development.
    expect(
      safeNotificationHref(
        "https://www.intrajetto.com/dashboard/fine?search=abc&page=1",
      ),
    ).toBe("https://www.intrajetto.com/dashboard/fine?search=abc&page=1");
    expect(
      safeNotificationHref(
        "http://localhost:3000/dashboard/deliveries?search=x&page=1",
      ),
    ).toBe("http://localhost:3000/dashboard/deliveries?search=x&page=1");
    expect(safeNotificationHref("/dashboard/fine?search=1")).toBe(
      "/dashboard/fine?search=1",
    );
  });
});

const mounted: Array<() => void> = [];

afterEach(() => {
  while (mounted.length) mounted.pop()!();
  context.notifications = [];
});

async function render(element: React.ReactElement): Promise<HTMLElement> {
  const container = document.createElement("div");
  document.body.appendChild(container);

  const root = createRoot(container);

  await act(async () => {
    root.render(element);
  });

  mounted.push(() => {
    act(() => root.unmount());
    container.remove();
  });

  return container;
}

const notification = (link: string) => ({
  id: `n-${Math.random()}`,
  title: "Multa registrada",
  message: "Uma nova multa foi registrada.",
  type: "FINE",
  read: false,
  created_at: new Date().toISOString(),
  link,
});

const hrefs = (): string[] =>
  [...document.querySelectorAll("a")].map(
    (anchor) => anchor.getAttribute("href") ?? "",
  );

describe("the notification card on /notifications", () => {
  it("renders no link for a hostile scheme", async () => {
    const { NotificationCard } =
      await import("@/app/(protected)/_components/notification-list/notification-card");

    for (const link of HOSTILE) {
      await render(
        createElement(NotificationCard, {
          notification: notification(link) as never,
          onRemoveFromCache: () => undefined,
          onUpdateInCache: () => undefined,
        }),
      );
    }

    expect(
      hrefs(),
      "um link de notificação com esquema perigoso foi renderizado",
    ).toEqual([]);
  });

  it("still renders the link the API sends today", async () => {
    const { NotificationCard } =
      await import("@/app/(protected)/_components/notification-list/notification-card");

    await render(
      createElement(NotificationCard, {
        notification: notification(
          "https://www.intrajetto.com/dashboard/fine?search=abc&page=1",
        ) as never,
        onRemoveFromCache: () => undefined,
        onUpdateInCache: () => undefined,
      }),
    );

    expect(hrefs()).toEqual([
      "https://www.intrajetto.com/dashboard/fine?search=abc&page=1",
    ]);
  });
});

describe("the bell menu", () => {
  it("renders hostile links as a plain item, and the safe one as a link", async () => {
    const { ProtectedNotificationsMenu } =
      await import("@/app/(protected)/_components/layout/protected-notifications-menu");

    context.notifications = [
      notification("javascript:alert(document.cookie)"),
      notification("data:text/html,<script>alert(1)</script>"),
      notification(
        "https://www.intrajetto.com/dashboard/fine?search=abc&page=1",
      ),
    ];

    const container = await render(createElement(ProtectedNotificationsMenu));

    const trigger = container.querySelector("button");
    expect(trigger).not.toBeNull();

    // Radix opens the menu on a primary-button pointerdown.
    await act(async () => {
      trigger!.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          button: 0,
          ctrlKey: false,
        }),
      );
    });

    expect(document.body.textContent, "o menu não abriu no teste").toContain(
      "Multa registrada",
    );

    expect(
      hrefs().filter((href) => !href.startsWith("/notifications")),
    ).toEqual(["https://www.intrajetto.com/dashboard/fine?search=abc&page=1"]);
  });
});

describe("the bell menu after the reader's access changed (NOTIF-ROLE-1)", () => {
  afterEach(async () => {
    const { useAuthStore } = await import("@/store/auth-store");

    useAuthStore.setState({
      role: null,
      permissions: [],
      enabledModules: null,
    });
  });

  it("keeps the item but no longer links a page the profile cannot open", async () => {
    const { useAuthStore } = await import("@/store/auth-store");
    const { ProtectedNotificationsMenu } =
      await import("@/app/(protected)/_components/layout/protected-notifications-menu");

    useAuthStore.setState({
      role: "BUSINESS_USER",
      permissions: [
        { permissionKey: "vehicle_manage", canRead: true, canWrite: false },
      ],
      enabledModules: ["FLEET", "DELIVERIES"],
    });

    context.notifications = [
      notification(
        "https://www.intrajetto.com/dashboard/deliveries?tab=deliveries",
      ),
      notification(
        "https://www.intrajetto.com/dashboard/vehicle?search=ABC1D23",
      ),
    ];

    const container = await render(createElement(ProtectedNotificationsMenu));

    await act(async () => {
      container.querySelector("button")!.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          button: 0,
          ctrlKey: false,
        }),
      );
    });

    expect(document.body.textContent).toContain("Multa registrada");

    expect(
      hrefs().filter((href) => !href.startsWith("/notifications")),
    ).toEqual(["https://www.intrajetto.com/dashboard/vehicle?search=ABC1D23"]);

    // The refused one is still there, as a plain item that says why.
    expect(
      document.querySelector(
        'button[title="Seu acesso não inclui mais esta página."]',
      ),
    ).not.toBeNull();
  });
});
