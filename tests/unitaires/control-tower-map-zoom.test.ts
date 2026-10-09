import * as React from "react";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import L from "leaflet";

/**
 * The tower's map with the real Leaflet (UI-TWR-2, UI-TWR-5).
 *
 * The clusters depend on the zoom, and were cut only when the positions
 * changed: clicking a cluster zoomed in and left it whole until the next poll
 * — and the fleet first appeared grouped at the zoom of the whole country.
 * The old test of this behaviour exercised the pure clustering function and
 * passed while the screen did not.
 */

// Leaflet sizes itself from the container; happy-dom lays nothing out.
const size = vi.hoisted(() => ({ width: 800, height: 480 }));

/** Every map the component creates, to read its zoom from Leaflet itself. */
const maps: L.Map[] = [];

let widthSpy: { mockRestore: () => void };
let heightSpy: { mockRestore: () => void };

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal("React", React);

  widthSpy = vi
    .spyOn(HTMLElement.prototype, "clientWidth", "get")
    .mockImplementation(() => size.width);
  heightSpy = vi
    .spyOn(HTMLElement.prototype, "clientHeight", "get")
    .mockImplementation(() => size.height);

  const create = L.map;

  vi.spyOn(L, "map").mockImplementation(((
    ...args: Parameters<typeof L.map>
  ) => {
    const map = create(...args);
    maps.push(map);
    return map;
  }) as typeof L.map);
});

afterAll(() => {
  widthSpy.mockRestore();
  heightSpy.mockRestore();
});

// Imported after the size stubs are defined (they are read at map creation).
const load = () => import("@/features/control-tower/map");

/** A truck on the map, drawn as a running route. */
const position = (driverId: string, latitude: number, plate: string) => ({
  driverId,
  driverName: driverId,
  routeId: `route-${driverId}`,
  routeCode: 1,
  vehiclePlate: plate,
  latitude,
  longitude: -46.63,
  speed: null,
  heading: null,
  battery: null,
  recordedAt: new Date().toISOString(),
  fresh: true,
  state: "moving" as const,
  endedAt: null,
});

async function until(condition: () => boolean, ms = 2_000): Promise<boolean> {
  const deadline = performance.now() + ms;

  while (performance.now() < deadline) {
    if (condition()) return true;
    await act(async () => {
      await new Promise((done) => setTimeout(done, 20));
    });
  }

  return condition();
}

describe("the tower's map", () => {
  it("cuts the clusters at the zoom on screen, and again after a click", async () => {
    const { TowerMap } = await load();
    const { CLUSTER_RADIUS_PX, clusterPositions, metresPerPixel } =
      await import("@/features/control-tower/lib/cluster");

    const container = document.createElement("div");
    document.body.appendChild(container);

    const root = createRoot(container);

    const draw = (positions: ReturnType<typeof position>[]) =>
      act(async () => {
        root.render(
          createElement(TowerMap, {
            positions,
            trail: null,
            selectedDriverId: null,
            onSelectDriver: () => undefined,
            tiles: null,
          }),
        );
      });

    const markers = () =>
      [...container.querySelectorAll(".leaflet-marker-icon")]
        .map((marker) => (marker.textContent ?? "").trim())
        .sort();

    const zoomOf = () => maps[maps.length - 1]?.getZoom() ?? Number.NaN;

    const expected = (fleet: ReturnType<typeof position>[], zoom: number) =>
      clusterPositions(fleet, zoom)
        .map((cluster) =>
          cluster.items.length === 1
            ? cluster.items[0].vehiclePlate
            : String(cluster.items.length),
        )
        .sort();

    // A truck across town keeps the fit at city scale.
    const far = position("d3", -23.62, "CCC3C33");

    await draw([position("d1", -23.55, "AAA1A11"), far]);

    // Framed on the fleet, then cut at THAT zoom — the old map cut at the
    // country-wide zoom 4 it starts with, before the fit.
    expect(await until(() => zoomOf() > 4)).toBe(true);

    const fitted = zoomOf();

    // Two trucks in one grid cell at this zoom, 1.2 cells apart two levels in.
    const latStep =
      (CLUSTER_RADIUS_PX * metresPerPixel(-23.55, fitted)) / 111_320;
    // Well inside the cell: the grid is scaled from the first truck's latitude,
    // which moves its edges by a fraction of a cell.
    const base = (Math.floor(-23.55 / latStep) + 0.35) * latStep;

    const fleet = [
      position("d1", base, "AAA1A11"),
      position("d2", base + 0.3 * latStep, "BBB2B22"),
      far,
    ];

    await draw(fleet);

    expect(
      await until(
        () =>
          JSON.stringify(markers()) ===
          JSON.stringify(expected(fleet, zoomOf())),
      ),
      `zoom ${zoomOf()}: ${markers().join(", ")}`,
    ).toBe(true);
    expect(markers()).toContain("2");

    const cluster = [
      ...container.querySelectorAll(".leaflet-marker-icon"),
    ].find(
      (marker) => (marker.textContent ?? "").trim() === "2",
    ) as HTMLElement;

    await act(async () => {
      cluster.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(await until(() => zoomOf() === fitted + 2)).toBe(true);

    // Apart at the new zoom straight away, not at the next poll.
    expect(
      await until(
        () =>
          JSON.stringify(markers()) ===
          JSON.stringify(expected(fleet, zoomOf())),
      ),
      `zoom ${zoomOf()}: ${markers().join(", ")}`,
    ).toBe(true);
    expect(markers()).toEqual(["AAA1A11", "BBB2B22", "CCC3C33"]);

    await act(async () => root.unmount());
    container.remove();
  });

  async function renderAlone(
    tiles: { url: string; attribution: string } | null = null,
  ) {
    const { TowerMap } = await load();

    const container = document.createElement("div");
    document.body.appendChild(container);

    const root = createRoot(container);

    await act(async () => {
      root.render(
        createElement(TowerMap, {
          positions: [position("d1", -23.55, "AAA1A11")],
          trail: null,
          selectedDriverId: null,
          onSelectDriver: () => undefined,
          tiles,
        }),
      );
    });

    return {
      container,
      map: maps[maps.length - 1],
      unmount: async () => {
        await act(async () => root.unmount());
        container.remove();
      },
    };
  }

  it("does not take the page's wheel scroll until the map is clicked (UI-TWR-5)", async () => {
    const { container, map, unmount } = await renderAlone();

    // Scrolling the page over the map used to zoom the map instead.
    expect(map.scrollWheelZoom.enabled()).toBe(false);

    await act(async () => {
      map.fire("click");
    });

    expect(map.scrollWheelZoom.enabled()).toBe(true);

    await act(async () => {
      map.fire("mouseout");
    });

    expect(map.scrollWheelZoom.enabled()).toBe(false);

    // And says the base map is missing instead of showing a grey box.
    expect(container.textContent).toContain("Mapa base não configurado");

    await unmount();
  });

  it("leaves one finger to the page on a phone", async () => {
    const coarse = vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) =>
        ({
          matches: query.includes("coarse"),
          media: query,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
        }) as unknown as MediaQueryList,
    );

    const { container, map, unmount } = await renderAlone();

    // One finger scrolls the page; two pan and pinch the map.
    expect(map.dragging.enabled()).toBe(false);
    expect(map.touchZoom.enabled()).toBe(true);
    expect(container.textContent).toContain("Use dois dedos");

    await unmount();
    coarse.mockRestore();
  });

  it("names its controls in Portuguese, and its credits open in a new tab", async () => {
    const { container, unmount } = await renderAlone({
      url: "https://{s}.tiles.example.com/{z}/{x}/{y}.png",
      attribution: "© Exemplo",
    });

    // Leaflet's own buttons said "Zoom in" / "Zoom out" (title and name).
    const zoomIn = container.querySelectorAll(".leaflet-control-zoom-in");
    const zoomOut = container.querySelectorAll(".leaflet-control-zoom-out");

    expect(zoomIn).toHaveLength(1);
    expect(zoomOut).toHaveLength(1);
    expect(zoomIn[0].getAttribute("title")).toBe("Aumentar zoom");
    expect(zoomIn[0].getAttribute("aria-label")).toBe("Aumentar zoom");
    expect(zoomOut[0].getAttribute("title")).toBe("Diminuir zoom");
    expect(zoomOut[0].getAttribute("aria-label")).toBe("Diminuir zoom");

    // The credit kept Leaflet's English link title.
    const credits = container.querySelector(".leaflet-control-attribution");

    expect(credits?.textContent).toContain("Leaflet");
    expect(credits?.innerHTML).not.toMatch(/JavaScript library/);

    for (const link of credits?.querySelectorAll("a") ?? []) {
      expect(link.getAttribute("target"), link.outerHTML).toBe("_blank");
      expect(link.getAttribute("rel"), link.outerHTML).toContain("noopener");
    }

    await unmount();
  });

  it("draws the configured base map", async () => {
    const { container, unmount } = await renderAlone({
      url: "https://{s}.tiles.example.com/{z}/{x}/{y}.png",
      attribution: "© Exemplo",
    });

    expect(container.textContent).not.toContain("Mapa base não configurado");
    expect(
      container.querySelector(".leaflet-control-attribution")?.textContent,
    ).toContain("© Exemplo");

    await unmount();
  });
});

describe("a truck that moves between two renders", () => {
  it("keeps its marker element instead of being rebuilt", async () => {
    const { TowerMap } = await load();

    const container = document.createElement("div");
    document.body.appendChild(container);

    const root = createRoot(container);

    const draw = (latitude: number) =>
      act(async () => {
        root.render(
          createElement(TowerMap, {
            positions: [position("d1", latitude, "AAA1A11")],
            trail: null,
            selectedDriverId: null,
            onSelectDriver: () => undefined,
            tiles: null,
          }),
        );
      });

    const icon = () => container.querySelector(".leaflet-marker-icon");

    await draw(-23.55);
    expect(await until(() => Boolean(icon()))).toBe(true);

    const before = icon();

    // A ping a few metres on: the same truck, the same element (it used to
    // be cleared and rebuilt, which made it jump and lose focus).
    await draw(-23.5502);

    expect(container.querySelectorAll(".leaflet-marker-icon")).toHaveLength(1);
    expect(icon()).toBe(before);

    await act(async () => root.unmount());
    container.remove();
  });
});

describe("a cluster of finished routes (TWR-8)", () => {
  it("is drawn as concluídas, not as phones without signal", async () => {
    const { TowerMap } = await load();

    const container = document.createElement("div");
    document.body.appendChild(container);

    const root = createRoot(container);

    const ended = (driverId: string) => ({
      ...position(driverId, -23.55, `${driverId.toUpperCase()}1A11`),
      fresh: false,
      state: "ended" as const,
      endedAt: new Date().toISOString(),
    });

    // Same yard: one cluster at any zoom.
    await act(async () => {
      root.render(
        createElement(TowerMap, {
          positions: [ended("d1"), ended("d2")],
          trail: null,
          selectedDriverId: null,
          onSelectDriver: () => undefined,
          tiles: null,
        }),
      );
    });

    const marker = () =>
      container.querySelector(".leaflet-marker-icon div") as HTMLElement | null;

    expect(await until(() => Boolean(marker()))).toBe(true);

    expect(marker()!.textContent?.trim()).toBe("2 · concluídas");

    // Green (ended), not the grey of "sem sinal": the colour is the status.
    expect(marker()!.dataset.status).toBe("ended");

    await act(async () => root.unmount());
    container.remove();
  });
});

describe("the colour key of the trucks", () => {
  it("names every status the marker colours stand for", async () => {
    const { TowerMap } = await load();

    const container = document.createElement("div");
    document.body.appendChild(container);

    const root = createRoot(container);

    await act(async () => {
      root.render(
        createElement(TowerMap, {
          positions: [position("d1", -23.55, "ABC1D23")],
          trail: null,
          selectedDriverId: null,
          onSelectDriver: () => undefined,
          tiles: null,
        }),
      );
    });

    // Without a key, em rota / parado / pausa / sem sinal / concluída were
    // told apart by colour alone (WCAG 1.4.1).
    const legend = container.querySelector(
      'ul[aria-label="Legenda das cores dos veículos"]',
    );

    expect(legend).not.toBeNull();
    expect(
      [...legend!.querySelectorAll("li")].map((item) =>
        item.textContent?.trim(),
      ),
    ).toEqual(["Em rota", "Parado", "Em pausa", "Sem sinal", "Rota concluída"]);

    await act(async () => root.unmount());
    container.remove();
  });
});
