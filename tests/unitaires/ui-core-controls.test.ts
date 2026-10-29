import * as React from "react";
import { act, createElement, type ElementType, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The small shared controls the user named one by one (decisions 3.5, 3.6,
 * 3.8 and the copy button of Entregas 14), rendered:
 *
 * - the row menu is the legacy one — 160px, text only, truncated with a
 *   title, destructive in red, a blocked action disabled with its reason;
 * - a button on the company selector's line is the selector's height;
 * - the bell opens its menu without a tooltip;
 * - "copied" is a moment: the check mark goes away and a second press copies
 *   again;
 * - the column menu speaks Portuguese.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
  usePathname: () => "/admin/deliveries",
}));

vi.mock("@/store/auth-store", () => ({
  useAuthStore: () => ({ role: "BUSINESS_ADMIN" }),
}));

vi.mock("@/actions/notifications", () => ({
  handleMarkAllNotificationsAsRead: async () => ({}),
  handleMarkNotificationAsRead: async () => ({}),
}));

vi.mock(
  "@/app/(protected)/_components/layout/protected-provider/notifications-provider",
  () => ({
    useNotificationsContext: () => ({
      notifications: [],
      unreadCount: 1,
      connected: true,
      markAllNotificationsAsRead: () => {},
      markNotificationAsRead: () => {},
    }),
  }),
);

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

import {
  RowActionItem,
  RowActions,
  RowActionSeparator,
} from "@/components/shared/custom/row-actions";
import {
  PageActions,
  ProtectedPageToolbar,
} from "@/app/(protected)/_components/layout/protected-page-toolbar";
import { pageActionHeightClass } from "@/app/(protected)/_components/layout/protected-page-toolbar/page-toolbar-context";
import { ExportButton } from "@/app/(protected)/_components/shared/custom/export-button";
import { ProtectedNotificationsMenu } from "@/app/(protected)/_components/layout/protected-notifications-menu";
import {
  CopyField,
  COPIED_RESET_MS,
} from "@/components/shared/custom/copy-field";
import { DataTableColumnHeader } from "@/app/(protected)/_components/shared/tanstack-table/data-table-collumn-header";

// This runner compiles JSX with the classic runtime; the app's components
// (built for Next's automatic runtime) find `React` as a global at render.
(globalThis as { React?: typeof React }).React = React;

let root: Root | null = null;

async function mount(element: ReactElement): Promise<HTMLElement> {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  await act(async () => {
    root!.render(element);
  });

  return host;
}

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
  vi.useRealTimers();
});

/** Radix opens a menu trigger on Enter, the way a keyboard user would. */
async function pressEnter(element: Element): Promise<void> {
  await act(async () => {
    element.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );
  });
}

describe("the row actions menu", () => {
  async function openMenu(): Promise<HTMLElement> {
    const host = await mount(
      createElement(
        // Children are passed positionally, which the prop types cannot see.
        RowActions as ElementType,
        { entity: "a rota 12" },
        // `icon` is no longer a prop (decision 3.5, the type refuses it); one
        // passed anyway, by an untyped caller, must still not be drawn.
        createElement(RowActionItem as ElementType, {
          label: "Ver detalhes",
          icon: createElement("svg"),
          onSelect: () => {},
        }),
        createElement(RowActionItem, {
          label: "Liberar para o motorista agora mesmo",
          blockedReason: "A rota precisa de um veículo para ser liberada.",
          onSelect: () => {},
        }),
        createElement(RowActionSeparator),
        createElement(RowActionItem, {
          label: "Cancelar rota",
          destructive: true,
          onSelect: () => {},
        }),
      ),
    );

    await pressEnter(host.querySelector("[aria-label], button") as HTMLElement);

    return document.querySelector('[role="menu"]') as HTMLElement;
  }

  it("is a fixed 160px, like the 38 menus of the older screens", async () => {
    const menu = await openMenu();

    const classes = menu.className.split(/\s+/);

    expect(classes).toContain("w-[160px]");
    expect(classes).not.toContain("min-w-[160px]");
    expect(classes).not.toContain("max-w-[280px]");
  });

  it("is text only, with truncate and the full label in title", async () => {
    const menu = await openMenu();

    const items = Array.from(menu.querySelectorAll('[role="menuitem"]'));

    expect(items.map((item) => item.textContent)).toEqual([
      "Ver detalhes",
      "Liberar para o motorista agora mesmo",
      "Cancelar rota",
    ]);

    for (const item of items) {
      expect(item.querySelector("svg"), item.textContent!).toBeNull();
      expect(item.className).toContain("truncate");
      expect(item.getAttribute("title")).toBe(item.textContent);
    }
  });

  it("paints the destructive item red and disables the blocked one explaining why", async () => {
    const menu = await openMenu();

    const items = Array.from(
      menu.querySelectorAll('[role="menuitem"]'),
    ) as HTMLElement[];

    const cancel = items.find((item) => item.textContent === "Cancelar rota")!;
    const blocked = items.find((item) =>
      item.textContent!.startsWith("Liberar"),
    )!;

    expect(cancel.className).toContain("text-red-600");
    expect(items[0].className).not.toContain("text-red-600");

    expect(blocked.hasAttribute("data-disabled")).toBe(true);

    // The tooltip wrapper, which is what makes the reason reachable on a
    // disabled item (no pointer events of its own).
    expect(blocked.parentElement!.getAttribute("data-state")).not.toBeNull();
  });
});

describe("the buttons on the company selector's line", () => {
  it("rule: h-9 everywhere, with or without the selector (decision 16.61)", () => {
    expect(pageActionHeightClass({ inToolbar: true, hasContext: true })).toBe(
      "h-9",
    );
    expect(pageActionHeightClass({ inToolbar: true, hasContext: false })).toBe(
      "h-9",
    );
    expect(pageActionHeightClass({ inToolbar: false, hasContext: false })).toBe(
      "h-9",
    );
  });

  const exportButton = () =>
    createElement(ExportButton, {
      exportRequest: () => ({
        url: "/api/relay/vehicle/export-vehicle",
        fallbackFilename: "veiculos.csv",
        refusalFallback: "Não foi possível exportar.",
      }),
      hasData: true,
      writePermission: true,
    });

  it("gives Exportar beside the selector the standard h-9, not the selector's h-10", async () => {
    const host = await mount(
      createElement(ProtectedPageToolbar, {
        context: createElement("div", null, "seletor"),
        actions: createElement(PageActions, null, exportButton()),
      }),
    );

    const button = host.querySelector('[data-tutorial="export-button"]')!;

    expect(button.className.split(/\s+/)).toContain("h-9");
    expect(button.className.split(/\s+/)).not.toContain("h-10");
  });

  it("gives the same Exportar without a selector (/dashboard) the same h-9", async () => {
    const host = await mount(
      createElement(ProtectedPageToolbar, {
        actions: createElement(PageActions, null, exportButton()),
      }),
    );

    const button = host.querySelector('[data-tutorial="export-button"]')!;

    expect(button.className.split(/\s+/)).toContain("h-9");
  });

  it("stacks the buttons at full width on a phone and shares the row from sm", async () => {
    const host = await mount(
      createElement(
        PageActions,
        null,
        createElement("button", null, "Atualizar"),
        createElement("button", null, "Nova Entrega"),
      ),
    );

    const classes = (
      host.querySelector("[data-page-actions]") as HTMLElement
    ).className.split(/\s+/);

    expect(classes).toEqual(
      expect.arrayContaining([
        "flex-col",
        "[&>*]:w-full",
        "sm:flex-row",
        "sm:[&>*]:w-auto",
      ]),
    );
  });
});

describe("the bell", () => {
  it("announces the count in the right singular", async () => {
    const host = await mount(createElement(ProtectedNotificationsMenu));

    expect(host.querySelector("button")!.getAttribute("aria-label")).toBe(
      "Notificações: 1 não lida",
    );
  });

  it("does not open a tooltip on focus or on pointer", async () => {
    const host = await mount(createElement(ProtectedNotificationsMenu));

    const bell = host.querySelector("button")!;

    // Radix opens a tooltip immediately on focus; the old bell did.
    await act(async () => {
      bell.focus();
      bell.dispatchEvent(new FocusEvent("focus"));
      bell.dispatchEvent(new PointerEvent("pointermove", { bubbles: true }));
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 400));
    });

    expect(document.querySelector('[role="tooltip"]')).toBeNull();
  });
});

describe("the copy button", () => {
  const writeText = vi.fn(async () => {});

  beforeEach(() => {
    writeText.mockClear();
    toast.success.mockClear();

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
  });

  async function click(element: Element): Promise<void> {
    await act(async () => {
      (element as HTMLElement).click();
    });
  }

  it("goes back to normal after ~2s and copies again on the second click", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

    const host = await mount(
      createElement(CopyField, { value: "whsec_abc123", label: "o segredo" }),
    );

    const button = host.querySelector("button")!;

    expect(button.getAttribute("aria-label")).toBe("Copiar o segredo");

    await click(button);

    expect(writeText).toHaveBeenCalledWith("whsec_abc123");
    expect(button.getAttribute("aria-label")).toBe("Copiado");

    await act(async () => {
      vi.advanceTimersByTime(COPIED_RESET_MS);
    });

    expect(button.getAttribute("aria-label")).toBe("Copiar o segredo");

    await click(button);

    expect(writeText).toHaveBeenCalledTimes(2);
    expect(button.getAttribute("aria-label")).toBe("Copiado");
  });

  it("a second click before the time restarts the countdown instead of clearing early", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

    const host = await mount(
      createElement(CopyField, { value: "tk_live_1", label: "a chave" }),
    );

    const button = host.querySelector("button")!;

    await click(button);

    await act(async () => {
      vi.advanceTimersByTime(COPIED_RESET_MS - 500);
    });

    await click(button);

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(button.getAttribute("aria-label")).toBe("Copiado");
  });

  // The one-time secret dialogs ask "Fechar sem guardar?" on ESC or X; they
  // need to know the secret was copied to stop asking.
  it("tells the user when the copy worked, and only then", async () => {
    const onCopied = vi.fn();

    const host = await mount(
      createElement(CopyField, {
        value: "whsec_abc123",
        label: "o segredo",
        onCopied,
      }),
    );

    await click(host.querySelector("button")!);

    expect(onCopied).toHaveBeenCalledTimes(1);

    writeText.mockRejectedValueOnce(new Error("NotAllowedError"));

    await click(host.querySelector("button")!);

    expect(onCopied).toHaveBeenCalledTimes(1);
  });

  it("the button follows the value's height", async () => {
    const host = await mount(
      createElement(CopyField, { value: "x".repeat(120), label: "o segredo" }),
    );

    const row = host.querySelector("[data-copy-field]")!;
    const button = host.querySelector("button")!;

    expect(row.className).toContain("items-stretch");
    expect(button.className.split(/\s+/)).toEqual(
      expect.arrayContaining(["self-stretch", "h-auto"]),
    );
  });
});

describe("the column header menu", () => {
  it("speaks Portuguese", async () => {
    const column = {
      getCanSort: () => true,
      getIsSorted: () => false,
      toggleSorting: () => {},
      toggleVisibility: () => {},
    };

    const host = await mount(
      createElement(DataTableColumnHeader, {
        column: column as never,
        title: "Placa",
      }),
    );

    await pressEnter(host.querySelector("button")!);

    const labels = Array.from(
      document.querySelectorAll('[role="menuitem"]'),
    ).map((item) => item.textContent?.trim());

    expect(labels).toEqual(["Crescente", "Decrescente", "Ocultar coluna"]);
  });
});
