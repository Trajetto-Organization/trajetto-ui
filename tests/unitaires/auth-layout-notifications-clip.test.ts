import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  BROWSER_STEP_TIMEOUT_MS,
  hasChromium,
  measureInChromium,
} from "./helpers/measure-in-chromium";
import { renderHtml } from "./helpers/render-html";

vi.mock("next/navigation", () => ({ usePathname: () => "/login" }));

import { AuthLayout } from "@/components/layouts/auth-layout";

const AXE = readFileSync(
  resolve(__dirname, "../../node_modules/axe-core/axe.min.js"),
  "utf8",
);

/** /login as the root layout lays it out: a full-height flex column. */
const loginPage = () =>
  createElement(
    "div",
    { className: "flex min-h-screen flex-col" },
    createElement(AuthLayout, null, createElement("div")),
  );

/**
 * Lighthouse failed /login on colour contrast: "Notificações" (text-neutral-300)
 * at 1.48:1 against #ffffff, though on screen it sits on the zinc-900 panel.
 *
 * The animated list above the heading grows to 50 white cards, far past its
 * 300px box. Only a mask-image fade hid them, and a mask is paint: in the DOM
 * the cards still ran down under the heading, which is where axe found white
 * (and where they were on screen in a browser that ignores the unprefixed
 * mask-image this ships, Chromium before 120). The list is now clipped to its
 * box, and the heading's lines carry the panel's own colour, because axe
 * files a clipped card by what is visible of it but tests the text against
 * its whole box: a card cut by the clip edge still counts just below it.
 */
describe("the login panel's notification list and its heading", () => {
  const host = document.createElement("div");
  host.innerHTML = renderHtml(loginPage());

  const heading = Array.from(host.querySelectorAll("h3")).find(
    (node) => node.textContent?.trim() === "Notificações",
  )!;
  const caption = heading.nextElementSibling!;
  const card = heading.closest(".group")!;
  const listBox = Array.from(card.children).find((child) =>
    child.querySelector("figure"),
  )!;

  it("clips the list to its box, where the fade already cuts it", () => {
    expect(listBox.classList).toContain("overflow-hidden");
    expect(listBox.className).toMatch(/\[mask-image:/);
  });

  it("paints the panel's colour behind the heading's lines", () => {
    const panel = host.querySelector(".absolute.inset-0")!;
    const panelColour = Array.from(panel.classList).find((name) =>
      name.startsWith("bg-"),
    );

    expect(panelColour).toBe("bg-zinc-900");
    expect(caption.textContent).toBe("Seja notificado quando algo acontecer.");
    for (const line of [heading, caption]) {
      expect(line.classList, line.textContent!).toContain(panelColour);
    }
  });
});

/**
 * The same, measured: the real markup and its Tailwind CSS in Chromium, the
 * list filled to its 50 cards, and axe's colour-contrast rule run on the
 * heading at every position of the list (one card's height, in 8px steps)
 * and with the page offset by 0–150px, since axe's 200px grid decides
 * whether a card cut at the clip edge is weighed against the text. Light
 * theme only: in the dark one the cards are transparent. At each position
 * the mask is also taken off, as an older browser would, and nothing of the
 * list may then be found below its box.
 *
 * The heading must be read on zinc-900 every time. The caption, when it
 * wraps, may come back undetermined (axe gives up when a card reaches under
 * one of its lines and not the other), which neither Lighthouse nor the a11y
 * suite counts as a failure; a violation or another colour would be one.
 */
describe.skipIf(!hasChromium)(
  `axe reads the login panel's heading on the panel${hasChromium ? "" : " — skipped: Chromium is not installed"}`,
  () => {
    // 1024: the caption wraps; 1350: Lighthouse's desktop; 1440: the a11y
    // suite's desktop; 1920: the cards narrower than the panel's card.
    for (const width of [1024, 1350, 1440, 1920]) {
      it(
        `at ${width}px, whatever the list shows`,
        async () => {
          const result = await measureInChromium(
            loginPage(),
            async () => {
              const axe = (
                window as unknown as { axe: typeof import("axe-core") }
              ).axe;
              const heading = Array.from(document.querySelectorAll("h3")).find(
                (node) => node.textContent?.trim() === "Notificações",
              )!;
              const lines = [heading, heading.nextElementSibling!];
              const block = heading.parentElement!;
              const card = heading.closest(".group")!;
              const first = document
                .querySelector("figure")!
                .closest(".stack-item")!;
              const list = first.parentElement as HTMLElement;
              const listBox = list.parentElement as HTMLElement;

              // The server markup holds the first card; the list adds one
              // every 1.4s up to 50.
              for (let count = 1; count < 50; count += 1) {
                list.appendChild(first.cloneNode(true));
              }

              const period = first.getBoundingClientRect().height + 16;
              const problems: string[] = [];
              const verdicts = new Map<Element, number>();
              let runs = 0;

              for (const shift of [0, 50, 100, 150]) {
                document.body.style.paddingTop = `${shift}px`;

                for (let offset = 0; offset < period; offset += 8) {
                  list.style.marginTop = `${offset}px`;
                  const where = `page +${shift}px, list +${offset}px`;

                  // Without the mask, nothing of the list below its box.
                  listBox.style.maskImage = "none";
                  const box = listBox.getBoundingClientRect();
                  const cardBox = card.getBoundingClientRect();
                  scan: for (
                    let y = box.bottom + 2;
                    y < cardBox.bottom;
                    y += 10
                  ) {
                    for (let x = cardBox.left + 4; x < cardBox.right; x += 20) {
                      if (
                        document
                          .elementsFromPoint(x, y)
                          .some((node) => node.closest("figure"))
                      ) {
                        problems.push(
                          `${where}: cartão abaixo da lista, sem a máscara`,
                        );
                        break scan;
                      }
                    }
                  }
                  listBox.style.maskImage = "";

                  const run = await axe.run(block, {
                    runOnly: ["color-contrast"],
                    elementRef: true,
                  });
                  runs += 1;

                  for (const line of lines) {
                    const kind = (
                      ["violations", "incomplete", "passes"] as const
                    ).find((found) =>
                      run[found].some((rule) =>
                        rule.nodes.some((node) => node.element === line),
                      ),
                    );
                    const node = kind
                      ? run[kind]
                          .flatMap((rule) => rule.nodes)
                          .find((found) => found.element === line)
                      : undefined;
                    const data = node?.any[0]?.data as
                      { bgColor?: string } | undefined;

                    if (kind === "passes") {
                      verdicts.set(line, (verdicts.get(line) ?? 0) + 1);
                      if (data?.bgColor !== "#18181b") {
                        problems.push(
                          `${where}: "${line.textContent}" lido sobre ${data?.bgColor}`,
                        );
                      }
                    } else if (kind !== "incomplete" || line === heading) {
                      problems.push(
                        `${where}: "${line.textContent}" ${node?.any[0]?.message ?? "não medido"}`,
                      );
                    }
                  }
                }
              }

              return {
                runs,
                problems,
                captionPasses: verdicts.get(lines[1]) ?? 0,
              };
            },
            { width, height: 940, scripts: [AXE] },
          );

          expect(result.runs).toBeGreaterThanOrEqual(40);
          expect(result.problems.slice(0, 6)).toEqual([]);
          expect(result.captionPasses).toBeGreaterThan(0);
        },
        BROWSER_STEP_TIMEOUT_MS * 2,
      );
    }
  },
);
