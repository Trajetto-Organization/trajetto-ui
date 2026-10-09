import * as React from "react";
import { createElement, type ElementType, type ReactElement } from "react";

import { beforeAll, describe, expect, it, vi } from "vitest";

import {
  Dialog,
  DialogFooter,
  DialogHeader,
  DialogScrollContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FieldShell,
  type FieldControlProps,
} from "@/components/shared/custom/field-shell";

import { hasChromium, measureInChromium } from "./helpers/measure-in-chromium";

/**
 * The default gap between loose children of a scrolling modal's body
 * (UI-MODAL-5), measured in a real browser.
 *
 * Cancelar Rota passes its field, a help line and its footer straight into
 * the body, and the screenshot showed them glued together. A class-name
 * assertion cannot catch the way this broke before: the gap rule had zero
 * specificity, so preflight's `p { margin: 0 }` beat it and the help line
 * stayed glued while the footer moved.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

// This runner compiles JSX with the classic runtime.
(globalThis as { React?: typeof React }).React = React;

/** A data attribute the prop types of a component cannot spell. */
const probe = (name: string): object => ({ "data-probe": name });

function cancelRouteDialog(): ReactElement {
  return createElement(
    Dialog,
    { open: true },
    createElement(
      // Children are passed positionally, which the prop types cannot see.
      DialogScrollContent as ElementType,
      null,
      createElement(
        DialogHeader,
        null,
        createElement(DialogTitle, null, "Cancelar rota"),
      ),
      // The three loose children of the real Cancelar Rota body.
      createElement(FieldShell, {
        label: "Motivo do cancelamento *",
        htmlFor: "reason",
        children: (control: FieldControlProps) =>
          createElement("textarea", { ...control, ...probe("field") }),
      }),
      createElement(
        "p",
        { className: "text-xs text-muted-foreground", ...probe("help") },
        "Fica registrado na rota e no histórico da operação.",
      ),
      createElement(
        DialogFooter,
        probe("footer"),
        createElement("button", { type: "button" }, "Manter rota"),
      ),
      // A caller's own margin still decides for its element.
      createElement(
        "p",
        { className: "mt-1 text-xs", ...probe("own-margin") },
        "Observação colada de propósito.",
      ),
    ),
  );
}

interface Measured {
  bareParagraph: string;
  fieldTop: string;
  helpTop: string;
  gapFieldToHelp: number;
  footerTop: string;
  ownMarginTop: string;
}

describe.skipIf(!hasChromium)(
  "the scrolling modal body, measured in Chromium (skipped without an installed browser)",
  () => {
    let measured: Measured;

    beforeAll(async () => {
      measured = await measureInChromium(cancelRouteDialog(), () => {
        const probe = (name: string): HTMLElement =>
          document.querySelector(`[data-probe="${name}"]`) as HTMLElement;
        const top = (element: Element): string =>
          getComputedStyle(element).marginTop;

        // Outside the modal, to show preflight is really in play.
        const bare = document.createElement("p");
        document.body.appendChild(bare);

        // FieldShell's root: the first loose child of the body.
        const field = probe("field").closest(".content-start.gap-3")!;
        const help = probe("help");

        return {
          bareParagraph: top(bare),
          fieldTop: top(field),
          helpTop: top(help),
          gapFieldToHelp:
            help.getBoundingClientRect().top -
            field.getBoundingClientRect().bottom,
          footerTop: top(probe("footer")),
          ownMarginTop: top(probe("own-margin")),
        };
      });
    }, 60_000);

    it("preflight is active: a paragraph outside the modal has no margin", () => {
      expect(measured.bareParagraph).toBe("0px");
    });

    it("separates the help paragraph from the field above, as it separates the footer", () => {
      expect(measured.helpTop).toBe("16px");

      // Within a pixel: the modal is centred with a -50% translate, which
      // lands its content on sub-pixel positions.
      expect(Math.abs(measured.gapFieldToHelp - 16)).toBeLessThanOrEqual(1);

      expect(measured.footerTop).toBe("16px");
    });

    it("does not push the first child and respects the margin the caller gave", () => {
      expect(measured.fieldTop).toBe("0px");
      expect(measured.ownMarginTop).toBe("4px");
    });
  },
);
