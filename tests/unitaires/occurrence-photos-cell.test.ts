import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { OccurrencePhotosCell } from "@/features/deliveries/occurrences/photos-cell";

/**
 * The occurrence feed's photo opens in the same inspector the proof audit
 * uses (DLVB-06): a damaged box or a smudged number has to be zoomed and
 * turned, which the fixed 800×600 preview did not allow.
 */
beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal("React", React);
});

let root: Root | null = null;

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

const PHOTOS = [
  "https://bucket.test/ocorrencia-1.webp?sig=a",
  "https://bucket.test/ocorrencia-2.webp?sig=b",
];

async function mount(photos: string[]): Promise<HTMLElement> {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  await act(async () => {
    root!.render(
      createElement(OccurrencePhotosCell, {
        photos,
        occurrenceTypeName: "Avaria",
      }),
    );
  });

  return host;
}

describe("occurrence photos cell", () => {
  it("opens the chosen photo in the inspector, with zoom and rotation", async () => {
    const host = await mount(PHOTOS);

    const second = host.querySelector(
      'button[aria-label="Abrir a foto 2 da ocorrência"]',
    ) as HTMLButtonElement;

    await act(async () => second.click());

    const dialog = document.querySelector('[role="dialog"]');
    const stage = dialog?.querySelector('[role="group"]');

    expect(stage?.getAttribute("aria-label")).toBe(
      "Foto 2 da ocorrência: Avaria",
    );
    expect(stage?.querySelector("img")?.getAttribute("src")).toBe(PHOTOS[1]);

    const labels = Array.from(dialog?.querySelectorAll("button") ?? []).map(
      (button) => button.getAttribute("aria-label"),
    );

    expect(labels).toEqual(
      expect.arrayContaining([
        "Aumentar zoom",
        "Diminuir zoom",
        "Girar a foto 90 graus",
      ]),
    );
  });

  it("shows a dash and no button when the report has no photo", async () => {
    const host = await mount([]);

    expect(host.textContent).toBe("—");
    expect(host.querySelector("button")).toBeNull();
  });
});
