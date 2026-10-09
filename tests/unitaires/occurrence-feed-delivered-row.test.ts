import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * A DELIVERED row of the Ocorrências feed (decision 14.3, design §7.3): the
 * proof shows the receipt and the signature thumbnails, plus who received,
 * next to the extra photos. A problem row keeps only its photos.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

(globalThis as { React?: typeof React }).React = React;

import { occurrenceImages } from "@/features/deliveries/occurrences/occurrence-images";
import { OccurrencePhotosCell } from "@/features/deliveries/occurrences/photos-cell";

let root: Root | null = null;

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

describe("the images of an occurrence row", () => {
  it("leads with the receipt and the signature, then the photos", () => {
    expect(
      occurrenceImages({
        photos: ["https://f/p1", "https://f/p2"],
        receipt_photo: "https://f/receipt",
        signature: "https://f/signature",
      }),
    ).toEqual([
      { url: "https://f/receipt", label: "Canhoto", contain: false },
      { url: "https://f/signature", label: "Assinatura", contain: true },
      { url: "https://f/p1", label: "Foto 1", contain: false },
      { url: "https://f/p2", label: "Foto 2", contain: false },
    ]);
  });

  it("keeps a problem row (or an older API) to its photos", () => {
    expect(occurrenceImages({ photos: ["https://f/p1"] })).toEqual([
      { url: "https://f/p1", label: "Foto 1", contain: false },
    ]);
    expect(
      occurrenceImages({ photos: [], receipt_photo: null, signature: null }),
    ).toEqual([]);
  });
});

describe("the photos cell of a delivered row", () => {
  it("shows the receipt, the signature and who received", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);

    await act(async () => {
      root!.render(
        createElement(OccurrencePhotosCell, {
          photos: [],
          receiptPhoto: "https://f/receipt",
          signature: "https://f/signature",
          receivedBy: "Maria (portaria)",
          occurrenceTypeName: "Entrega normal",
        }),
      );
    });

    const images = [...host.querySelectorAll("img")].map((image) =>
      image.getAttribute("alt"),
    );

    expect(images).toEqual([
      "Canhoto da ocorrência",
      "Assinatura da ocorrência",
    ]);
    expect(host.textContent).toContain("Quem recebeu: Maria (portaria)");
  });
});
