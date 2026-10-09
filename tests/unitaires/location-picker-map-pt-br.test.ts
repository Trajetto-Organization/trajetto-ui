import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "react-query";

import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

/**
 * The location picker's map (every address field with a map: shippers,
 * deliveries, branches), with the real Leaflet.
 *
 * Its zoom buttons said "Zoom in" / "Zoom out" — Leaflet's defaults, read
 * aloud and shown on hover — and it hid the attribution while drawing
 * openstreetmap.org tiles, whose usage policy requires a visible credit.
 * The credit's links open in a new tab: the picker sits inside a form, and
 * following a link in the same tab would drop what was typed.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

import { useLocationPicker } from "@/app/(protected)/_components/shared/custom/location-picker/hooks";
import { clearPublicConfig, seedPublicConfig } from "./helpers/public-config";

beforeAll(() => {
  vi.stubGlobal("React", React);
});

beforeEach(() => {
  // A development server: public OSM is its fallback map (decision 7.4).
  seedPublicConfig();
});

let root: Root | null = null;

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
  clearPublicConfig();
});

function Picker(): JSX.Element {
  const { mapRef } = useLocationPicker({
    onLocationChange: () => undefined,
    latitude: -23.55,
    longitude: -46.63,
  } as Parameters<typeof useLocationPicker>[0]);

  return createElement("div", {
    ref: mapRef,
    style: { width: 400, height: 300 },
  });
}

async function mount(): Promise<HTMLElement> {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, enabled: false } },
  });

  await act(async () => {
    root!.render(
      createElement(QueryClientProvider, { client }, createElement(Picker)),
    );
  });

  return host;
}

describe("the location picker's map", () => {
  it("names its zoom buttons in Portuguese, once", async () => {
    const host = await mount();

    const zoomIn = host.querySelectorAll(".leaflet-control-zoom-in");
    const zoomOut = host.querySelectorAll(".leaflet-control-zoom-out");

    expect(zoomIn).toHaveLength(1);
    expect(zoomOut).toHaveLength(1);
    expect(zoomIn[0].getAttribute("title")).toBe("Aumentar zoom");
    expect(zoomIn[0].getAttribute("aria-label")).toBe("Aumentar zoom");
    expect(zoomOut[0].getAttribute("title")).toBe("Diminuir zoom");
    expect(zoomOut[0].getAttribute("aria-label")).toBe("Diminuir zoom");
  });

  it("credits OpenStreetMap on the map, in Portuguese, without leaving the form", async () => {
    const host = await mount();

    const credits = host.querySelector(".leaflet-control-attribution");

    expect(
      credits,
      "o mapa não mostra a atribuição do OpenStreetMap",
    ).not.toBeNull();
    expect(credits!.textContent).toContain("colaboradores do OpenStreetMap");
    expect(credits!.innerHTML).not.toMatch(/contributors|JavaScript library/);

    for (const link of credits!.querySelectorAll("a")) {
      expect(link.getAttribute("target"), link.outerHTML).toBe("_blank");
      expect(link.getAttribute("rel"), link.outerHTML).toContain("noopener");
    }
  });
});

/**
 * Decision 7.4: the picker drew public OSM tiles in every environment, hard
 * coded, while the tower read its provider from the environment. Now it
 * draws the same configured provider, and none outside development when
 * there is none (OSM does not take commercial load).
 */
describe("the location picker's base map", () => {
  function Probe(): JSX.Element {
    const { mapRef, tilesUnavailable } = useLocationPicker({
      onLocationChange: () => undefined,
      latitude: -23.55,
      longitude: -46.63,
    } as Parameters<typeof useLocationPicker>[0]);

    return createElement(
      "div",
      null,
      createElement("div", { ref: mapRef, style: { width: 400, height: 300 } }),
      tilesUnavailable ? createElement("p", { id: "no-tiles" }) : null,
    );
  }

  async function mountProbe(): Promise<HTMLElement> {
    const host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, enabled: false } },
    });

    await act(async () => {
      root!.render(
        createElement(QueryClientProvider, { client }, createElement(Probe)),
      );
    });

    return host;
  }

  it("draws the configured provider, with its credit", async () => {
    seedPublicConfig({
      appEnv: "production",
      mapTiles: {
        url: "https://tiles.example.test/{z}/{x}/{y}.png",
        attribution: "© Exemplo",
      },
    });

    const host = await mountProbe();
    const credits = host.querySelector(".leaflet-control-attribution");

    expect(credits?.textContent).toContain("© Exemplo");
    expect(credits?.textContent).not.toContain("OpenStreetMap");
    expect(host.querySelector("#no-tiles")).toBeNull();
  });

  it("draws no public OSM in production without a provider, and says so", async () => {
    seedPublicConfig({ appEnv: "production", mapTiles: null });

    const host = await mountProbe();

    expect(host.querySelector(".leaflet-tile-pane img")).toBeNull();
    expect(
      host.querySelector(".leaflet-control-attribution")?.textContent ?? "",
    ).not.toContain("OpenStreetMap");
    expect(host.querySelector("#no-tiles")).not.toBeNull();
  });
});
