import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { describe, expect, it } from "vitest";

import { PHONE_SCREENS, PhoneMockup } from "@/components/site/phone-mockup";

/**
 * The driver app as the public pages draw it (design: Trajetto Phone).
 *
 * A picture of the app stays honest only if it says what the app says: its
 * tab bar is the app's own, and its forms mark required and optional fields
 * the way the app does. Both are read from trajetto-mobile, not copied here.
 * (Ported from the old marketing mockup's suite when the redesign replaced it.)
 */

// This runner compiles JSX with the classic runtime.
(globalThis as { React?: typeof React }).React = React;

const MOBILE = resolve(process.cwd(), "../trajetto-mobile");
const MOBILE_TABS_LAYOUT = resolve(
  MOBILE,
  "app/(protected)/(tabs)/_layout.tsx",
);

// trajetto-ui is its own repository: these read the driver app next to it
// (a workstation, a cross-repo job) and say so in the title when it is not.
const MOBILE_MISSING = " — skipped: ../trajetto-mobile is not checked out";

function screenDom(screen: (typeof PHONE_SCREENS)[number]): HTMLElement {
  const container = document.createElement("div");
  container.innerHTML = renderToStaticMarkup(
    React.createElement(PhoneMockup, { screen }),
  );
  return container;
}

const text = (element: Element) =>
  (element.textContent ?? "").replace(/\s+/g, " ").trim();

describe.skipIf(!existsSync(MOBILE_TABS_LAYOUT))(
  `the mockup's tab bar (read from trajetto-mobile)${existsSync(MOBILE_TABS_LAYOUT) ? "" : MOBILE_MISSING}`,
  () => {
    it("is the app's tabs, in the app's order and with its labels", () => {
      const source = readFileSync(MOBILE_TABS_LAYOUT, "utf8");
      const appLabels = [
        ...source.matchAll(/name:\s*"\w+",\s*label:\s*"([^"]+)"/g),
      ].map((match) => match[1]);
      expect(appLabels.length).toBeGreaterThan(0);

      // The deliveries screen is the one that shows the tab bar.
      const container = screenDom("deliveries");
      const bar = Array.from(container.querySelectorAll("div")).find(
        (element) => {
          const labels = Array.from(element.children).map(text);
          return (
            labels.length === appLabels.length && labels.includes(appLabels[0])
          );
        },
      );

      expect(bar, "barra de abas no mockup").toBeTruthy();
      expect(Array.from(bar!.children).map(text)).toEqual(appLabels);
    });
  },
);

/**
 * The app's forms mark a required field `Nome *` (red asterisk) and an
 * optional one `Nome (opcional)` (decision 3.3).
 */
const MOBILE_FORMS = [
  "app/(protected)/delivery-proof.tsx",
  "app/(protected)/delivery-occurrence.tsx",
  "components/screens/fuel/fuel-form.tsx",
].map((file) => resolve(MOBILE, file));

type Mark = "required" | "optional";

function appLabelMarks(): Map<string, Mark> {
  const marks = new Map<string, Mark>();

  for (const file of MOBILE_FORMS) {
    const source = readFileSync(file, "utf8");

    // <Input label="Nome" required ... /> and <Input label="Nome (opcional)" ... />
    for (const match of source.matchAll(/label="([^"]+)"([\s\S]*?)\/>/g)) {
      const optional = /^(.*?)\s*\(opcional\)$/i.exec(match[1]);

      if (optional) marks.set(optional[1], "optional");
      else if (/^\s*required\s*$/m.test(match[2]))
        marks.set(match[1], "required");
    }

    // Nome <Text className="text-destructive">*</Text>. The theme token, or
    // any red shade from before the dark theme: the app's own contrast test
    // (trajetto-mobile ui-contrast) decides the colour.
    for (const match of source.matchAll(
      /([A-ZÀ-Ý][^<>{}\n]*?)\s*(?:\{" "\})?\s*<Text className="text-(?:destructive|red-\d{3})">\*<\/Text>/g,
    )) {
      marks.set(match[1].trim(), "required");
    }

    // Nome{" "}<Text className="font-normal text-muted">(opcional)</Text>
    for (const match of source.matchAll(
      /([A-ZÀ-Ý][^<>{}\n]*?)\s*(?:\{" "\})?\s*<Text className="font-normal text-(?:muted|gray-500)">\(opcional\)<\/Text>/g,
    )) {
      marks.set(match[1].trim(), "optional");
    }
  }

  return marks;
}

describe.skipIf(!MOBILE_FORMS.every((file) => existsSync(file)))(
  `the mockup's form labels (read from trajetto-mobile)${
    MOBILE_FORMS.every((file) => existsSync(file)) ? "" : MOBILE_MISSING
  }`,
  () => {
    it("mark required and optional fields as the app does", () => {
      const marks = appLabelMarks();
      const shownLabels = PHONE_SCREENS.flatMap((screen) =>
        Array.from(screenDom(screen).querySelectorAll("p")).map(text),
      );

      const checked: string[] = [];

      for (const [label, mark] of marks) {
        const shown = shownLabels.find(
          (candidate) =>
            candidate === label ||
            (candidate.startsWith(label) &&
              /^ (?:\*|\(opcional\))$/.test(candidate.slice(label.length))),
        );
        if (!shown) continue;

        checked.push(label);
        expect(shown, label).toBe(
          mark === "required" ? `${label} *` : `${label} (opcional)`,
        );
      }

      // The fields that carry the delivery and the fuel record.
      expect(checked).toEqual(
        expect.arrayContaining([
          "Foto do canhoto",
          "Assinatura na tela",
          "Quem recebeu",
          "Foto do Odômetro",
          "Quantidade de Litros",
        ]),
      );
    });
  },
);

describe("the mockup is a picture", () => {
  it.each(PHONE_SCREENS)(
    "%s: one image with a description, no control inside",
    (screen) => {
      const container = screenDom(screen);
      const phone = container.firstElementChild!;

      expect(phone.getAttribute("role")).toBe("img");
      expect(phone.getAttribute("aria-label")).toMatch(
        /^App do motorista Trajetto\. \S/,
      );
      expect(
        container.querySelector(
          "button, a, input, select, textarea, [tabindex]",
        ),
      ).toBeNull();
    },
  );
});

describe("the primary action of a form screen", () => {
  // Red before: the button sat inline at the end of the form, mid-screen,
  // with blank phone below it. It is now pinned to the bottom like an
  // Android action bar. The rendered position is checked in a browser by
  // the screenshots of the site-details package (1440/390, light/dark).
  const ACTIONS: ReadonlyArray<[(typeof PHONE_SCREENS)[number], string]> = [
    ["proof", "Confirmar entrega"],
    ["fuel", "Abastecer"],
    ["checklist", "Criar Checklist"],
  ];

  it.each(ACTIONS)(
    "pins %s's action to a bottom bar outside the content",
    (screen, label) => {
      const container = screenDom(screen);
      const bar = container.querySelector("[data-phone-action-bar]");

      expect(bar, screen).not.toBeNull();
      expect(text(bar!)).toBe(label);
      const classes = bar!.className.split(/\s+/);
      expect(classes).toEqual(
        expect.arrayContaining([
          "absolute",
          "inset-x-0",
          "bottom-0",
          "border-t",
          "backdrop-blur-md",
        ]),
      );
      // A sibling of the content, not the last row of the form.
      expect(
        bar!.parentElement!.querySelector(":scope > [data-phone-action-bar]"),
      ).toBe(bar);
      // The label appears once: the bar is the only action on the screen.
      expect(text(container).split(label).length - 1).toBe(1);
    },
  );

  it("leaves screens without a primary action without a bar", () => {
    for (const screen of PHONE_SCREENS.filter(
      (id) => !ACTIONS.some(([withAction]) => withAction === id),
    )) {
      expect(
        screenDom(screen).querySelector("[data-phone-action-bar]"),
        screen,
      ).toBeNull();
    }
  });
});
