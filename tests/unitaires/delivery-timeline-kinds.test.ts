import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, describe, expect, it, vi } from "vitest";

import type { TimelineEntry } from "@/actions/delivery/get-delivery";

/**
 * The delivery's history draws every kind the API sends (decision 14.7):
 * adding a delivery to a route and taking it off are timeline facts, and a
 * kind this screen does not know yet must render as a generic line instead
 * of taking the whole dialog down.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

(globalThis as { React?: typeof React }).React = React;

import { DeliveryTimeline } from "@/features/deliveries/deliveries/timeline";
import { timelineKindMeta } from "@/features/deliveries/deliveries/timeline/kind-meta";

let root: Root | null = null;

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

function entry(
  kind: string,
  title: string,
  detail: string | null = null,
): TimelineEntry {
  return {
    id: `e-${kind}`,
    kind: kind as TimelineEntry["kind"],
    at: "2026-10-05T12:00:00.000Z",
    title,
    detail,
    author: { kind: "USER", name: "Ana" },
    photos: [],
  } as unknown as TimelineEntry;
}

async function render(entries: TimelineEntry[]): Promise<HTMLElement> {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  await act(async () => {
    root!.render(createElement(DeliveryTimeline, { entries }));
  });

  return host;
}

describe("the delivery's timeline kinds", () => {
  it("names the route planning facts", () => {
    expect(timelineKindMeta("ROUTE_ADDED").label).toBe("Adicionada à rota");
    expect(timelineKindMeta("ROUTE_REMOVED").label).toBe("Retirada da rota");
  });

  it("falls back to a generic line for a kind it does not know", () => {
    expect(timelineKindMeta("SOMETHING_NEW").label).toBe("Evento");
  });

  it("renders route lines and an unknown kind without crashing", async () => {
    const host = await render([
      entry("ROUTE_ADDED", "Adicionada à rota", "Rota 12"),
      entry("ROUTE_REMOVED", "Retirada da rota", "Rota 12"),
      entry("SOMETHING_NEW", "Algo novo"),
    ]);

    expect(host.querySelectorAll("li")).toHaveLength(3);
    expect(host.textContent).toContain("Adicionada à rota");
    expect(host.textContent).toContain("Retirada da rota");
    expect(host.textContent).toContain("Algo novo");
  });
});
