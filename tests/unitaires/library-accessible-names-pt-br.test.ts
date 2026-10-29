import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { Calendar } from "@/components/ui/calendar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { Toaster } from "@/components/ui/sonner";

import { renderHtml } from "./helpers/render-html";

/**
 * Accessible names that come from a library's defaults, not from src.
 *
 * accessible-names-pt-br.test.ts reads the literals written in src, so it
 * cannot see a name a dependency fills in by itself. Four did:
 * react-day-picker's month arrows ("Go to previous month" / "Go to next
 * month", untouched by `locale`) inside every date field; sonner's toast
 * region ("Notifications alt+T") with its X ("Close toast") on the realtime
 * notification toasts; cmdk's listbox ("Suggestions") under every combobox —
 * the business selector, the pickers, the table filters; and Radix's
 * navigation landmark ("Main") in the public site's menu. Rendered through
 * the shared primitives, as the product renders them.
 *
 * Checked and clean: kbar, Radix Slider with one thumb (it only names two or
 * more), react-easy-crop, input-otp. Leaflet and dnd-kit also ship English
 * names, but they are configured per use, not through a shared primitive.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

beforeAll(() => {
  vi.stubGlobal("React", React);
});

/** The value of every `aria-label` in the markup. */
function ariaLabels(html: string): string[] {
  return [...html.matchAll(/aria-label="([^"]*)"/g)].map((match) => match[1]);
}

describe("the calendar every date field opens", () => {
  const september2026 = new Date(2026, 8, 1);

  it("names the month arrows in Portuguese", () => {
    const html = renderHtml(
      createElement(Calendar, {
        locale: ptBR,
        mode: "single",
        defaultMonth: september2026,
      }),
    );

    expect(html).toMatch(
      /name="previous-month"[^>]*aria-label="Mês anterior"|aria-label="Mês anterior"[^>]*name="previous-month"/,
    );
    expect(html).toMatch(
      /name="next-month"[^>]*aria-label="Próximo mês"|aria-label="Próximo mês"[^>]*name="next-month"/,
    );
  });

  it("names the dropdowns and week numbers in Portuguese, and nothing in English", () => {
    const html = renderHtml(
      createElement(Calendar, {
        locale: ptBR,
        mode: "single",
        defaultMonth: september2026,
        captionLayout: "dropdown-buttons",
        fromYear: 2020,
        toYear: 2030,
        showWeekNumber: true,
        // Week numbers are only buttons, and only named, when clickable.
        onWeekNumberClick: () => undefined,
      }),
    );
    const labels = ariaLabels(html);

    expect(labels).toEqual(
      expect.arrayContaining(["Mês", "Ano", "Mês anterior", "Próximo mês"]),
    );
    expect(labels.some((label) => /^Semana \d+$/.test(label))).toBe(true);
    expect(
      labels.filter((label) => /\b(go to|month|year|week)\b/i.test(label)),
    ).toEqual([]);
  });

  it("still lets a caller name one control differently", () => {
    const html = renderHtml(
      createElement(Calendar, {
        locale: ptBR,
        mode: "single",
        defaultMonth: september2026,
        labels: { labelNext: () => "Mês seguinte" },
      }),
    );

    expect(ariaLabels(html)).toEqual(
      expect.arrayContaining(["Mês anterior", "Mês seguinte"]),
    );
  });
});

describe("the list under every combobox", () => {
  function picker(listLabel?: string): string {
    return renderHtml(
      createElement(
        Command,
        null,
        createElement(CommandInput, { placeholder: "Buscar motorista…" }),
        createElement(
          CommandList,
          listLabel ? { label: listLabel } : null,
          createElement(CommandEmpty, null, "Nenhum motorista encontrado."),
          createElement(
            CommandGroup,
            null,
            createElement(CommandItem, { value: "ana" }, "Ana Souza"),
          ),
        ),
      ),
    );
  }

  it("names the listbox in Portuguese", () => {
    const html = picker();

    expect(html).toMatch(
      /role="listbox"[^>]*aria-label="Sugestões"|aria-label="Sugestões"[^>]*role="listbox"/,
    );
    expect(
      ariaLabels(html).filter((label) => /suggestion/i.test(label)),
    ).toEqual([]);
  });

  it("still lets a caller name the list", () => {
    expect(ariaLabels(picker("Motoristas"))).toContain("Motoristas");
  });
});

describe("the public site's navigation menu", () => {
  function menu(props: Record<string, unknown> | null): string {
    return renderHtml(
      createElement(
        NavigationMenu,
        props,
        createElement(
          NavigationMenuList,
          null,
          createElement(
            NavigationMenuItem,
            null,
            createElement(NavigationMenuLink, { href: "/precos" }, "Preços"),
          ),
        ),
      ),
    );
  }

  it("names its landmark in Portuguese", () => {
    const html = menu(null);

    expect(html).toMatch(/<nav[^>]*aria-label="Principal"/);
    expect(ariaLabels(html)).not.toContain("Main");
  });

  it("still lets a caller name it", () => {
    expect(menu({ "aria-label": "Institucional" })).toMatch(
      /<nav[^>]*aria-label="Institucional"/,
    );
  });
});

describe("the toaster mounted on every page", () => {
  let root: Root | null = null;

  afterEach(async () => {
    await act(async () => {
      toast.dismiss();
      root?.unmount();
    });
    root = null;
    document.body.innerHTML = "";
  });

  async function mountToaster(): Promise<HTMLElement> {
    const host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);

    await act(async () => {
      root!.render(createElement(Toaster));
    });

    const region = host.querySelector("section");

    expect(region, "a região dos avisos não foi montada").not.toBeNull();

    return region as HTMLElement;
  }

  it("names its region in Portuguese", async () => {
    const region = await mountToaster();

    expect(region.getAttribute("aria-label")).toMatch(/^Notificações\b/);
  });

  it("names a notification's close button in Portuguese", async () => {
    const region = await mountToaster();

    // The shape the realtime notifications use (notifications-provider).
    await act(async () => {
      toast.message("", {
        closeButton: true,
        action: createElement(
          "div",
          null,
          createElement("strong", null, "Entrega concluída"),
        ),
      });
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    const close = region.querySelector("button[data-close-button]");

    expect(close, "o toast não mostrou o botão de fechar").not.toBeNull();
    expect(close!.getAttribute("aria-label")).toBe("Fechar notificação");
  });
});
