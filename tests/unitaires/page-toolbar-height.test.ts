import * as React from "react";
import { createElement, Fragment, type ReactElement } from "react";

import { beforeAll, describe, expect, it, vi } from "vitest";

import { ProtectedPageToolbar } from "@/app/(protected)/_components/layout/protected-page-toolbar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";

import { hasChromium, measureInChromium } from "./helpers/measure-in-chromium";

/**
 * Every button of a page's action row is h-9 (36px), on /admin beside the
 * company selector AND on /dashboard without it (decision 16.61, which
 * reverses 3.6's h-10 beside the selector), measured in a real browser.
 *
 * The row enforces it, not each button: the area screens still render their
 * Importar / Revalidar / Nova Rota with `h-9 … sm:h-8`, and a row where one
 * button had adopted the hook and its neighbours had not showed two heights
 * side by side. What is asserted is the rendered height, because the rule is
 * a cascade question — a parent's descendant selector against each button's
 * own responsive class.
 *
 * Switches and checkboxes render as `<button role=…>` and must keep their own
 * size: a 36px-tall switch is a broken control, not a matching one.
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

/** The action row as the area screens write it today. */
const legacyActions = (): ReactElement =>
  createElement(
    Fragment,
    null,
    createElement(
      Button,
      {
        variant: "outline",
        className: "h-9 w-9 p-0 sm:h-8 sm:w-full sm:px-3",
        ...probe("action"),
      },
      "Revalidar",
    ),
    createElement(
      Button,
      { size: "sm", className: "h-9 w-full sm:h-8", ...probe("action") },
      "Nova Rota",
    ),
    createElement(Switch, {
      "aria-label": "Somente ativos",
      ...probe("switch"),
    }),
    createElement(Checkbox, {
      "aria-label": "Selecionar todos",
      ...probe("checkbox"),
    }),
  );

function toolbar(withSelector: boolean): ReactElement {
  return createElement(ProtectedPageToolbar, {
    // Stands in for the BusinessSelector, whose trigger is `h-10`.
    context: withSelector
      ? createElement("div", { className: "h-10 w-64", ...probe("selector") })
      : undefined,
    actions: legacyActions(),
  });
}

interface Heights {
  selector: number | null;
  actions: number[];
  toggles: { switch: number | null; checkbox: number | null };
}

const measureHeights = (): Heights => {
  const height = (name: string): number | null =>
    (document.querySelector(`[data-probe="${name}"]`) as HTMLElement | null)
      ?.offsetHeight ?? null;

  return {
    selector: height("selector"),
    actions: Array.from(
      document.querySelectorAll<HTMLElement>('[data-probe="action"]'),
    ).map((button) => button.offsetHeight),
    toggles: { switch: height("switch"), checkbox: height("checkbox") },
  };
};

describe.skipIf(!hasChromium)(
  "the toolbar button height, measured in Chromium (skipped without an installed browser)",
  () => {
    let withSelector: Heights;
    let withoutSelector: Heights;

    beforeAll(async () => {
      withSelector = await measureInChromium(toolbar(true), measureHeights);
      withoutSelector = await measureInChromium(toolbar(false), measureHeights);
    }, 60_000);

    it("on the selector's line (/admin), every button is 36px, not the selector's 40px", () => {
      expect(withSelector.selector).toBe(40);
      expect(withSelector.actions).toEqual([36, 36]);
    });

    it("without a selector (/dashboard), the buttons are the same 36px", () => {
      expect(withoutSelector.actions).toEqual([36, 36]);
    });

    it("keeps the switch and the checkbox at their own size", () => {
      // Switch `h-6`, Checkbox `h-4`: the same as anywhere else.
      expect(withSelector.toggles).toEqual(withoutSelector.toggles);
      expect(withSelector.toggles).toEqual({ switch: 24, checkbox: 16 });
    });
  },
);
