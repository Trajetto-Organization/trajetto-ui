import { act, createElement, type ElementType, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFormFooter,
  DialogHeader,
  DialogScrollContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  dialogFooterLayoutFor,
  headerJustifyClass,
} from "@/components/ui/dialog-layout";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";

/**
 * The modal primitives, rendered, asked the questions decision 3.2 answers.
 *
 * Every dialog in the product is built from these two files, so each rule is
 * checked once here instead of ninety times in the screens: a click beside the
 * modal does not close it (ESC still does), the X says "Fechar" and shows its
 * ring only for the keyboard, nothing can widen the modal sideways, the header
 * centres on a phone, a long confirmation scrolls inside itself, and the
 * footer lays itself out from the modal's own width.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

let root: Root | null = null;

async function mount(element: ReactElement): Promise<void> {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  await act(async () => {
    root!.render(element);
  });

  // Radix arms its outside-pointer listener on the next tick.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

const dialogEl = (): HTMLElement =>
  document.querySelector(
    '[role="dialog"], [role="alertdialog"]',
  ) as HTMLElement;

async function pointerDownOutside(): Promise<void> {
  const outside = document.createElement("button");
  document.body.appendChild(outside);

  await act(async () => {
    outside.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, button: 0 }),
    );
  });
}

function formDialog(
  Content: typeof DialogContent | typeof DialogScrollContent,
  props: Record<string, unknown>,
  onOpenChange: (open: boolean) => void,
): ReactElement {
  return createElement(
    Dialog,
    { open: true, onOpenChange },
    createElement(
      // Children are passed positionally, which the prop types cannot see.
      Content as ElementType,
      props,
      createElement(
        DialogHeader,
        null,
        createElement(DialogTitle, null, "Criar embarcador"),
        createElement(DialogDescription, null, "Preencha os dados."),
      ),
      createElement("input", { "aria-label": "Nome" }),
    ),
  );
}

describe("clicking outside the modal", () => {
  for (const [name, Content] of [
    ["DialogContent", DialogContent],
    ["DialogScrollContent", DialogScrollContent],
  ] as const) {
    it(`does not close a ${name} by default`, async () => {
      const onOpenChange = vi.fn();

      await mount(formDialog(Content, {}, onOpenChange));
      await pointerDownOutside();

      expect(onOpenChange).not.toHaveBeenCalledWith(false);
    });

    it(`closes a ${name} only when the caller asks`, async () => {
      // The opt-in exists and works — otherwise "not closing" above could
      // just mean the click never reached Radix.
      const onOpenChange = vi.fn();

      await mount(
        formDialog(Content, { closeOnOutsideClick: true }, onOpenChange),
      );
      await pointerDownOutside();

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it(`${name} still closes with ESC and still calls the caller's onInteractOutside`, async () => {
      const onOpenChange = vi.fn();
      const onInteractOutside = vi.fn();

      await mount(formDialog(Content, { onInteractOutside }, onOpenChange));
      await pointerDownOutside();

      expect(onInteractOutside).toHaveBeenCalled();
      expect(onOpenChange).not.toHaveBeenCalledWith(false);

      await act(async () => {
        document.activeElement?.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
      });

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  }
});

describe("the modal's X", () => {
  it("is named Fechar and shows the focus ring only for the keyboard", async () => {
    await mount(formDialog(DialogScrollContent, {}, () => {}));

    const close = Array.from(dialogEl().querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Fechar"),
    );

    expect(close, "o botão de fechar não se chama Fechar").toBeDefined();
    expect(close!.textContent).not.toContain("Close");

    // `focus:` would ring the X as soon as Radix focuses it on open.
    expect(close!.className).toContain("focus-visible:ring-2");
    expect(close!.className).not.toMatch(/(^|\s)focus:ring/);
  });
});

describe("the drawer's X (Sheet)", () => {
  it("follows the same rule as the modal", async () => {
    await mount(
      createElement(
        Sheet,
        { open: true },
        createElement(
          SheetContent,
          null,
          createElement(SheetTitle, null, "Menu"),
          createElement(SheetDescription, null, "Navegação."),
        ),
      ),
    );

    const close = Array.from(dialogEl().querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Fechar"),
    );

    expect(close, "o botão de fechar não se chama Fechar").toBeDefined();
    expect(close!.className).not.toMatch(/(^|\s)focus:ring/);
  });
});

describe("sideways scrolling", () => {
  it("DialogScrollContent has a minmax(0,1fr) column and never scrolls sideways, even with the caller's overflow-y-auto", async () => {
    await mount(
      formDialog(
        DialogScrollContent,
        { className: "max-w-xl max-h-[90vh] overflow-y-auto" },
        () => {},
      ),
    );

    const classes = dialogEl().className.split(/\s+/);

    expect(classes).toContain("grid-cols-[minmax(0,1fr)]");

    // The caller's `overflow-y-auto` also made `overflow-x` auto — the native
    // bar under Detalhes da Entrega. The primitive's `overflow-hidden` wins.
    expect(classes).toContain("overflow-hidden");
    expect(classes).not.toContain("overflow-y-auto");
  });

  it("the body undoes the ScrollArea's display:table so truncate works", async () => {
    await mount(formDialog(DialogScrollContent, {}, () => {}));

    const viewport = dialogEl().querySelector(
      "[data-radix-scroll-area-viewport]",
    ) as HTMLElement;

    expect(viewport.parentElement!.className).toContain(
      "[&>[data-radix-scroll-area-viewport]>div]:!block",
    );
  });

  it("the plain DialogContent also has the minmax(0,1fr) column", async () => {
    await mount(formDialog(DialogContent, {}, () => {}));

    expect(dialogEl().className.split(/\s+/)).toContain(
      "grid-cols-[minmax(0,1fr)]",
    );
  });
});

describe("the header", () => {
  it("centres the whole block below sm, flex titles included", async () => {
    await mount(formDialog(DialogScrollContent, {}, () => {}));

    const header = dialogEl().querySelector("h2")!.parentElement!;
    const classes = header.className.split(/\s+/);

    // `text-center` alone never moved a flex title (icon + text + badge).
    expect(classes).toEqual(
      expect.arrayContaining([
        "items-center",
        "text-center",
        "sm:items-stretch",
        "sm:text-left",
      ]),
    );

    expect(dialogEl().querySelector("h2")!.className).toContain(
      "justify-center",
    );
  });

  it("the AlertDialog one follows the same rule", async () => {
    await mount(
      createElement(
        AlertDialog,
        { open: true },
        createElement(
          AlertDialogContent,
          null,
          createElement(
            AlertDialogHeader,
            null,
            createElement(AlertDialogTitle, null, "Cancelar entrega?"),
            // A flex description (icon + text), like the flex titles.
            createElement(
              AlertDialogDescription,
              { className: "flex items-center gap-2" },
              "Não dá para desfazer.",
            ),
          ),
          createElement(
            AlertDialogFooter,
            null,
            createElement(AlertDialogCancel, null, "Cancelar"),
          ),
        ),
      ),
    );

    const header = dialogEl().querySelector("h2")!.parentElement!;

    expect(header.className.split(/\s+/)).toEqual(
      expect.arrayContaining(["items-center", "sm:items-stretch"]),
    );

    for (const part of [
      dialogEl().querySelector("h2")!,
      dialogEl().querySelector("p")!,
    ]) {
      expect(part.className.split(/\s+/)).toEqual(
        expect.arrayContaining(["justify-center", "sm:justify-start"]),
      );
    }
  });
});

describe("the title alignment", () => {
  it("centres by default and respects a justify picked by the caller", () => {
    expect(headerJustifyClass(undefined)).toBe(
      "justify-center sm:justify-start",
    );
    expect(headerJustifyClass("flex items-center gap-2")).toBe(
      "justify-center sm:justify-start",
    );

    // A responsive default would override `justify-between` from `sm` up.
    expect(headerJustifyClass("flex justify-between")).toBe("");
    expect(headerJustifyClass("flex md:justify-end")).toBe("");
  });
});

describe("a long confirmation", () => {
  it("scrolls inside itself and never sideways", async () => {
    await mount(
      createElement(
        AlertDialog,
        { open: true },
        createElement(
          AlertDialogContent,
          null,
          createElement(AlertDialogTitle, null, "Cancelar entrega?"),
          createElement(AlertDialogDescription, null, "Não dá para desfazer."),
        ),
      ),
    );

    const classes = dialogEl().className.split(/\s+/);

    expect(classes).toEqual(
      expect.arrayContaining([
        "max-h-[90dvh]",
        "overflow-y-auto",
        "overflow-x-hidden",
        "grid-cols-[minmax(0,1fr)]",
      ]),
    );
  });
});

describe("the form footer", () => {
  async function footerIn(className?: string): Promise<HTMLElement> {
    await mount(
      createElement(
        Dialog,
        { open: true },
        createElement(
          DialogScrollContent as ElementType,
          { className },
          createElement(
            DialogHeader,
            null,
            createElement(DialogTitle, null, "Título"),
            createElement(DialogDescription, null, "Descrição."),
          ),
          createElement(
            DialogFormFooter,
            null,
            createElement("button", { type: "button" }, "Cancelar"),
            createElement("button", { type: "submit" }, "Salvar"),
          ),
        ),
      ),
    );

    return dialogEl().querySelector("[data-dialog-footer]") as HTMLElement;
  }

  it("in a modal up to max-w-xl puts Cancelar and the action side by side, sharing the row", async () => {
    const footer = await footerIn("max-w-xl");

    expect(footer.dataset.dialogFooter).toBe("fill");
    expect(footer.className).toContain("[&>*]:flex-1");
    expect(footer.className).not.toContain("flex-col");
  });

  it("in a larger modal puts the buttons on the right", async () => {
    const footer = await footerIn("max-w-3xl");

    expect(footer.dataset.dialogFooter).toBe("end");
    expect(footer.className).toContain("sm:justify-end");
  });

  it("without max-w (the primitive's max-w-lg) it is a small modal", async () => {
    const footer = await footerIn(undefined);

    expect(footer.dataset.dialogFooter).toBe("fill");
  });
});

/**
 * The confirmations (AlertDialog) had their own footer, always stacked on a
 * phone and right-aligned from `sm`, so a delete confirmation and a create
 * form of the same width laid out Cancelar differently. They follow the same
 * width rule now (decision 3.2).
 */
describe("the confirmation footer", () => {
  async function alertFooterIn(
    contentClassName?: string,
    footerClassName?: string,
  ): Promise<HTMLElement> {
    await mount(
      createElement(
        AlertDialog,
        { open: true },
        createElement(
          AlertDialogContent,
          { className: contentClassName },
          createElement(
            AlertDialogHeader,
            null,
            createElement(AlertDialogTitle, null, "Excluir?"),
            createElement(
              AlertDialogDescription,
              null,
              "Não dá para desfazer.",
            ),
          ),
          createElement(
            AlertDialogFooter,
            { className: footerClassName },
            createElement(AlertDialogCancel, null, "Cancelar"),
            createElement("button", { type: "button" }, "Excluir"),
          ),
        ),
      ),
    );

    return dialogEl().querySelector("[data-dialog-footer]") as HTMLElement;
  }

  it("in a regular confirmation (max-w-lg) puts Cancelar and the action side by side", async () => {
    const footer = await alertFooterIn();

    expect(footer.dataset.dialogFooter).toBe("fill");
    expect(footer.className).toContain("[&>*]:flex-1");
    expect(footer.className).not.toContain("flex-col");
  });

  it("in a wide confirmation puts the buttons on the right", async () => {
    const footer = await alertFooterIn("max-w-3xl");

    expect(footer.dataset.dialogFooter).toBe("end");
    expect(footer.className).toContain("sm:justify-end");
  });

  it("imposes no margin: the caller's still applies", async () => {
    const footer = await alertFooterIn(undefined, "mt-5");

    expect(footer.className.split(/\s+/)).toContain("mt-5");
    expect(footer.className.split(/\s+/)).not.toContain("mt-6");
  });
});

describe("the footer width rule", () => {
  it.each([
    [undefined, "fill"],
    ["max-w-md", "fill"],
    ["max-w-lg", "fill"],
    ["max-w-xl max-h-[90vh] overflow-y-auto", "fill"],
    ["max-w-2xl", "end"],
    ["max-w-4xl", "end"],
    ["sm:max-w-[500px]", "fill"],
    ["sm:max-w-[640px]", "end"],
    ["max-w-[95vw] sm:max-w-md", "fill"],
    ["max-w-[95vw] md:max-w-4xl", "end"],
    ["w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] sm:max-w-3xl", "end"],
    ["max-w-screen-lg", "end"],
    ["sm:max-w-xl lg:max-w-5xl", "end"],
  ])("%s → %s", (className, expected) => {
    expect(dialogFooterLayoutFor(className)).toBe(expected);
  });
});
