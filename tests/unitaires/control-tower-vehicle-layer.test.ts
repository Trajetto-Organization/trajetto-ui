import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import L from "leaflet";

import {
  VehicleLayer,
  type VehicleInput,
} from "@/features/control-tower/map/vehicle-layer";

/**
 * The tower's trucks with the real Leaflet: one marker per truck, kept across
 * updates, sliding to each new point on requestAnimationFrame. The map used to
 * clear and rebuild every marker on each render, so a truck jumped (and its
 * element, focus and pulse were replaced) on every ping and every refetch.
 */
beforeAll(() => {
  // Leaflet sizes itself from the container; happy-dom lays nothing out.
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(
    () => 800,
  );
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(
    () => 480,
  );
});

/** A hand-driven animation clock: frames run only when the test says so. */
let frames: Array<(now: number) => void> = [];
let clock = 0;
let reducedMotion = false;
let hidden = false;

beforeEach(() => {
  frames = [];
  clock = 1_000;
  reducedMotion = false;
  hidden = false;

  vi.spyOn(performance, "now").mockImplementation(() => clock);
  vi.stubGlobal("requestAnimationFrame", (callback: (now: number) => void) => {
    frames.push(callback);
    return frames.length;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {
    frames = [];
  });
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("reduce") ? reducedMotion : false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
  vi.spyOn(document, "visibilityState", "get").mockImplementation(() =>
    hidden ? "hidden" : "visible",
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Advances the clock and runs the frames that were pending. */
function runFrames(at: number): void {
  clock = at;

  const pending = frames;

  frames = [];

  for (const frame of pending) frame(at);
}

const START = { latitude: -23.55, longitude: -46.63 };
/** About 111 m east of START. */
const EAST = { latitude: -23.55, longitude: -46.62891 };

function truck(overrides: Partial<VehicleInput> = {}): VehicleInput {
  return {
    id: "d1",
    ...START,
    heading: null,
    recordedAt: "2026-10-08T12:00:00.000Z",
    status: "moving",
    label: "ABC1D23",
    ...overrides,
  };
}

function setup(cluster = true) {
  const container = document.createElement("div");
  document.body.appendChild(container);

  const map = L.map(container, {
    center: [START.latitude, START.longitude],
    zoom: 15,
  });
  const layer = new VehicleLayer(map, { cluster });

  const markers = () => {
    const found: L.Marker[] = [];

    map.eachLayer((candidate) => {
      if (candidate instanceof L.Marker) found.push(candidate);
    });

    return found;
  };

  const rotation = () =>
    container.querySelector<HTMLElement>(".trj-vh__rotor")?.style.transform ??
    "";

  return {
    container,
    map,
    layer,
    markers,
    rotation,
    dispose: () => {
      layer.destroy();
      map.remove();
      container.remove();
    },
  };
}

describe("a truck that reports a new point", () => {
  it("keeps the same marker and element instead of rebuilding them", () => {
    const view = setup();

    view.layer.update([truck()], null);

    const [marker] = view.markers();
    const element = marker.getElement();

    view.layer.update(
      [truck({ ...EAST, recordedAt: "2026-10-08T12:00:04.000Z" })],
      null,
    );
    runFrames(clock + 10_000);

    expect(view.markers()).toEqual([marker]);
    expect(marker.getElement()).toBe(element);

    view.dispose();
  });

  it("slides there over the time between the reports, eased", () => {
    const view = setup();

    view.layer.update([truck()], null);
    view.layer.update(
      [truck({ ...EAST, recordedAt: "2026-10-08T12:00:04.000Z" })],
      null,
    );

    const [marker] = view.markers();

    // Not there yet: the update itself does not move it.
    expect(marker.getLatLng().lng).toBeCloseTo(START.longitude, 8);

    // Half the 4 s: half way (the ease is symmetric).
    runFrames(1_000 + 2_000);
    expect(marker.getLatLng().lng).toBeCloseTo(
      (START.longitude + EAST.longitude) / 2,
      7,
    );

    runFrames(1_000 + 4_000);
    expect(marker.getLatLng().lng).toBeCloseTo(EAST.longitude, 8);

    // Landed: the loop stops asking for frames.
    expect(frames).toHaveLength(0);

    view.dispose();
  });

  it("turns toward where it went when the phone sends no heading", () => {
    const view = setup();

    view.layer.update([truck()], null);
    view.layer.update(
      [truck({ ...EAST, recordedAt: "2026-10-08T12:00:02.000Z" })],
      null,
    );
    runFrames(1_000 + 2_000);

    expect(view.rotation()).toMatch(
      /rotate\(90\.\d+deg\)|rotate\(89\.\d+deg\)/,
    );

    view.dispose();
  });

  it("continues from where it is drawn when a point lands mid-slide", () => {
    const view = setup();

    view.layer.update([truck()], null);
    view.layer.update(
      [truck({ ...EAST, recordedAt: "2026-10-08T12:00:04.000Z" })],
      null,
    );
    runFrames(1_000 + 2_000);

    const [marker] = view.markers();
    const midway = marker.getLatLng().lng;

    // A newer point back at the start, while half way.
    view.layer.update(
      [truck({ ...START, recordedAt: "2026-10-08T12:00:08.000Z" })],
      null,
    );
    runFrames(clock + 16);

    // No jump to either end: still about where it was.
    expect(Math.abs(marker.getLatLng().lng - midway)).toBeLessThan(0.00002);

    view.dispose();
  });

  it("jumps without animation under reduced motion", () => {
    reducedMotion = true;

    const view = setup();

    view.layer.update([truck()], null);
    view.layer.update(
      [truck({ ...EAST, recordedAt: "2026-10-08T12:00:04.000Z" })],
      null,
    );

    expect(view.markers()[0].getLatLng().lng).toBeCloseTo(EAST.longitude, 8);
    expect(frames).toHaveLength(0);

    view.dispose();
  });

  it("does not animate while the tab is hidden, and lands on return", () => {
    const view = setup();

    view.layer.update([truck()], null);
    view.layer.update(
      [truck({ ...EAST, recordedAt: "2026-10-08T12:00:04.000Z" })],
      null,
    );

    hidden = true;
    document.dispatchEvent(new Event("visibilitychange"));

    expect(frames).toHaveLength(0);

    hidden = false;
    document.dispatchEvent(new Event("visibilitychange"));

    expect(view.markers()[0].getLatLng().lng).toBeCloseTo(EAST.longitude, 8);

    view.dispose();
  });
});

describe("what the marker says", () => {
  it("changes status and selection on the same element", () => {
    const view = setup();

    view.layer.update([truck()], null);

    const element = view.markers()[0].getElement()!;
    const root = element.querySelector<HTMLElement>(".trj-vh")!;

    expect(root.dataset).toMatchObject({
      status: "moving",
      live: "true",
      selected: "false",
    });
    expect(element.title).toBe("ABC1D23 — Em rota");

    view.layer.update([truck({ status: "paused" })], "d1");

    expect(view.markers()[0].getElement()).toBe(element);
    expect(root.dataset).toMatchObject({ status: "paused", selected: "true" });
    expect(element.getAttribute("aria-label")).toBe("ABC1D23 — Em pausa");

    view.layer.update([truck({ status: "silent" })], null);

    expect(root.dataset).toMatchObject({
      status: "silent",
      live: "false",
      selected: "false",
    });

    view.dispose();
  });

  it("names a new truck with its plate AND status for assistive tech", () => {
    const view = setup();

    view.layer.update([truck({ status: "paused" })], null);

    const element = view.markers()[0].getElement()!;

    // A role=button is named by aria-label first; without it the name is the
    // plate span's text, and the status is left to colour alone.
    expect(element.getAttribute("role")).toBe("button");
    expect(element.getAttribute("aria-label")).toBe("ABC1D23 — Em pausa");

    view.dispose();
  });

  it("names a cluster by what clicking it does, not by a bare count", () => {
    const view = setup();

    view.map.setZoom(5, { animate: false });
    view.layer.update(
      [truck(), truck({ id: "d2", ...EAST, label: "XYZ9K87" })],
      null,
    );

    const [cluster] = view.markers();

    expect(cluster.getElement()!.textContent?.trim()).toBe("2");
    expect(cluster.getElement()!.getAttribute("aria-label")).toBe(
      "2 veículos — clique para aproximar",
    );

    view.dispose();
  });

  it("colours a cluster of parked trucks as parked, as they look when it splits", () => {
    const view = setup();

    view.map.setZoom(5, { animate: false });
    view.layer.update(
      [
        truck({ status: "stopped" }),
        truck({ id: "d2", ...EAST, label: "XYZ9K87", status: "paused" }),
      ],
      null,
    );

    const badge = view.container.querySelector<HTMLElement>(".trj-vc")!;

    expect(badge.dataset.status).toBe("stopped");

    view.dispose();
  });

  it("keeps the focus ring of every other Leaflet marker", () => {
    const view = setup();

    view.layer.update([truck()], null);

    const css =
      document.getElementById("trj-vehicle-marker-styles")?.textContent ?? "";

    // A global `.leaflet-marker-icon:focus { outline: none }` stripped the
    // ring from stop pins and the location picker for the whole session.
    expect(css).not.toMatch(/(^|[\s,}])\.leaflet-marker-icon:focus\s*[{,]/);
    expect(css).toContain(".trj-vh-icon:focus");
    expect(
      view.markers()[0].getElement()!.classList.contains("trj-vh-icon"),
    ).toBe(true);

    view.dispose();
  });

  it("shows every plate at street zoom", () => {
    const view = setup();

    view.layer.update([truck()], null);
    expect(view.container.classList.contains("trj-vh-labels")).toBe(true);

    view.map.setZoom(12, { animate: false });
    view.layer.relayout();
    expect(view.container.classList.contains("trj-vh-labels")).toBe(false);

    view.dispose();
  });

  it("removes the marker of a truck that left the fleet", () => {
    const view = setup();

    view.layer.update(
      [truck(), truck({ id: "d2", ...EAST, label: "XYZ9K87" })],
      null,
    );
    expect(view.markers()).toHaveLength(2);

    view.layer.update([truck()], null);
    expect(view.markers()).toHaveLength(1);
    expect(view.container.textContent).not.toContain("XYZ9K87");

    view.dispose();
  });
});
