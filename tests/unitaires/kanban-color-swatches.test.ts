import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Nova Coluna / Editar Coluna at 320px (visual sweep, wave 4b): the eight
 * swatches ran past the modal and the selection was a black border, invisible
 * on the dark theme. Both dialogs now draw the same component.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

import {
  ColorSwatches,
  KANBAN_COLUMN_COLORS,
} from "@/app/(protected)/_components/kanban/column/color-swatches";

(globalThis as { React?: typeof React }).React = React;

let root: Root | null = null;

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

async function render(value: string, onChange = vi.fn()) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  await act(async () => {
    root!.render(createElement(ColorSwatches, { value, onChange }));
  });

  return { host, onChange };
}

describe("ColorSwatches", () => {
  it("wraps the row instead of overflowing the modal's edge", async () => {
    const { host } = await render("#64748b");

    expect(
      host.querySelector("[data-color-swatches]")!.className.split(/\s+/),
    ).toContain("flex-wrap");
  });

  it("marks the picked colour with a ring in the text colour, not a fixed black border", async () => {
    const { host } = await render("#3b82f6");

    const chosen = host.querySelector(
      '[aria-pressed="true"]',
    ) as HTMLButtonElement;

    expect(chosen.getAttribute("aria-label")).toBe("Cor Azul");
    expect(chosen.className).toContain("ring-foreground");
    expect(chosen.style.borderColor).toBe("");
    expect(host.querySelectorAll('[aria-pressed="false"]')).toHaveLength(
      KANBAN_COLUMN_COLORS.length - 1,
    );
  });

  it("each colour is announced by its Portuguese name, not by its hex code", async () => {
    const { host } = await render("#64748b");

    const names = Array.from(host.querySelectorAll("button")).map((button) =>
      button.getAttribute("aria-label"),
    );

    expect(names).toEqual([
      "Cor Ardósia",
      "Cor Azul",
      "Cor Âmbar",
      "Cor Violeta",
      "Cor Verde",
      "Cor Vermelho",
      "Cor Rosa",
      "Cor Ciano",
    ]);
  });

  it("picking a colour tells the form", async () => {
    const { host, onChange } = await render("#64748b");

    await act(async () => {
      (
        host.querySelector('[aria-label="Cor Vermelho"]') as HTMLButtonElement
      ).click();
    });

    expect(onChange).toHaveBeenCalledWith("#ef4444");
  });
});
