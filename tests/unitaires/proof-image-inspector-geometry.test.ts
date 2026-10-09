import { describe, expect, it } from "vitest";

import {
  INITIAL_VIEW,
  MAX_ZOOM,
  fittedSize,
  inspectorReducer,
  keyToAction,
  lensBackground,
  panLimit,
  pointToImage,
  visualSize,
  type InspectorBounds,
  type InspectorView,
  type Rotation,
} from "@/features/deliveries/proof-audits/image-inspector/geometry";

/**
 * The photo inspector of the proof audit (Entregas 10; DLVB-05, DLVB-06).
 *
 * The old viewer scaled the photo inside an `overflow-auto` box: at 2× the
 * top and left halves were overflow no scrollbar reached, which is where the
 * date and signature of a receipt usually are; a 90° turn overflowed the
 * 256px box; nothing put the view back. These are the rules that replace it.
 */
const STAGE = { width: 400, height: 300 };

// A landscape receipt photo, wider than the stage's ratio.
const PHOTO = { width: 1600, height: 900 };

const bounds: InspectorBounds = { natural: PHOTO, stage: STAGE };

const corner = (x: -1 | 1, y: -1 | 1) => ({
  x: (x * STAGE.width) / 2,
  y: (y * STAGE.height) / 2,
});

function run(
  view: InspectorView,
  ...actions: Parameters<typeof inspectorReducer>[1][]
) {
  return actions.reduce(
    (current, action) => inspectorReducer(current, action, bounds),
    view,
  );
}

describe("fitting the photo in the stage", () => {
  it("fits it whole, and still fits it once turned 90°", () => {
    for (const rotation of [0, 90, 180, 270] as Rotation[]) {
      const visual = visualSize(
        fittedSize(PHOTO, STAGE, rotation),
        rotation,
        1,
      );

      expect(visual.width, `${rotation}°`).toBeLessThanOrEqual(
        STAGE.width + 1e-9,
      );
      expect(visual.height, `${rotation}°`).toBeLessThanOrEqual(
        STAGE.height + 1e-9,
      );

      // And touches the stage on one axis: fitted, not shrunk for nothing.
      expect(
        Math.max(visual.width / STAGE.width, visual.height / STAGE.height),
        `${rotation}°`,
      ).toBeCloseTo(1, 9);
    }
  });

  it("does not move a photo that fits (zoom 1)", () => {
    const view = run(INITIAL_VIEW, { type: "panBy", dx: 500, dy: -500 });

    expect(view.pan).toEqual({ x: 0, y: 0 });
  });
});

describe("reaching every corner of a zoomed photo", () => {
  /** Where the photo point (u, v) is drawn, in stage coordinates. */
  function drawnAt(uv: { u: number; v: number }, view: InspectorView) {
    const fitted = fittedSize(PHOTO, STAGE, view.rotation);
    const radians = (view.rotation * Math.PI) / 180;

    const x = (uv.u - 0.5) * fitted.width * view.zoom;
    const y = (uv.v - 0.5) * fitted.height * view.zoom;

    return {
      x: view.pan.x + x * Math.cos(radians) - y * Math.sin(radians),
      y: view.pan.y + x * Math.sin(radians) + y * Math.cos(radians),
    };
  }

  const insideStage = (point: { x: number; y: number }) =>
    Math.abs(point.x) <= STAGE.width / 2 + 1e-6 &&
    Math.abs(point.y) <= STAGE.height / 2 + 1e-6;

  it.each([0, 90, 180, 270] as Rotation[])(
    "at 2× turned %i°, each corner of the photo can be dragged into view",
    (rotation) => {
      const zoomed = run(
        { ...INITIAL_VIEW, rotation },
        { type: "zoomTo", zoom: 2 },
      );

      // Dragged as far as it goes toward each side of the stage.
      const extremes = (
        [
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ] as const
      ).map(([x, y]) =>
        run(zoomed, { type: "panBy", dx: x * 10_000, dy: y * 10_000 }),
      );

      for (const uv of [
        { u: 0, v: 0 },
        { u: 1, v: 0 },
        { u: 0, v: 1 },
        { u: 1, v: 1 },
      ]) {
        expect(
          extremes.some((view) => insideStage(drawnAt(uv, view))),
          `${rotation}°: o canto ${uv.u},${uv.v} da foto nunca entra no palco`,
        ).toBe(true);
      }

      // And no drag uncovers the stage where the photo is larger than it.
      for (const view of extremes) {
        const visual = visualSize(
          fittedSize(PHOTO, STAGE, rotation),
          rotation,
          2,
        );
        const limit = panLimit(visual, STAGE);

        expect(Math.abs(view.pan.x)).toBeLessThanOrEqual(limit.x + 1e-9);
        expect(Math.abs(view.pan.y)).toBeLessThanOrEqual(limit.y + 1e-9);
      }
    },
  );

  it("keeps the photo covering the stage however far it is dragged", () => {
    const view = run(
      INITIAL_VIEW,
      { type: "zoomTo", zoom: 3 },
      { type: "panBy", dx: 9999, dy: 9999 },
    );

    const limit = panLimit(
      visualSize(fittedSize(PHOTO, STAGE, 0), 0, 3),
      STAGE,
    );

    expect(view.pan).toEqual(limit);
  });
});

describe("zooming into what is under the pointer", () => {
  it("keeps the photo point under the focus where it was", () => {
    const fitted = fittedSize(PHOTO, STAGE, 0);
    // Inside the pan limits at 2×, so the clamp does not move it.
    const focus = { x: 120, y: -30 };

    const before = pointToImage(focus, INITIAL_VIEW, fitted)!;
    const after = run(INITIAL_VIEW, { type: "zoomTo", zoom: 2, focus });

    const seen = pointToImage(focus, after, fitted)!;

    expect(seen.u).toBeCloseTo(before.u, 9);
    expect(seen.v).toBeCloseTo(before.v, 9);
  });

  it("zooms relative to the current zoom for a pinch, within the limits", () => {
    const view = run(
      INITIAL_VIEW,
      { type: "zoomBy", factor: 1.5 },
      { type: "zoomBy", factor: 1.5 },
    );

    expect(view.zoom).toBeCloseTo(2.25, 9);

    expect(run(view, { type: "zoomBy", factor: 100 }).zoom).toBe(MAX_ZOOM);
    expect(run(view, { type: "zoomBy", factor: 0.01 }).zoom).toBe(1);
  });
});

describe("the controls", () => {
  it("steps the zoom and restores everything with one action", () => {
    const busy = run(
      INITIAL_VIEW,
      { type: "zoomIn" },
      { type: "zoomIn" },
      { type: "rotate" },
      { type: "panBy", dx: 40, dy: 40 },
    );

    expect(busy.zoom).toBe(2);
    expect(busy.rotation).toBe(90);

    expect(run(busy, { type: "reset" })).toEqual(INITIAL_VIEW);
  });

  it("turns a quarter at a time and comes back to 0°", () => {
    const view = run(
      INITIAL_VIEW,
      { type: "rotate" },
      { type: "rotate" },
      { type: "rotate" },
      { type: "rotate" },
    );

    expect(view.rotation).toBe(0);
  });

  it("maps the keyboard: + − R 0 and the arrows", () => {
    expect(keyToAction("+", STAGE)).toEqual({ type: "zoomIn" });
    expect(keyToAction("-", STAGE)).toEqual({ type: "zoomOut" });
    expect(keyToAction("r", STAGE)).toEqual({ type: "rotate" });
    expect(keyToAction("0", STAGE)).toEqual({ type: "reset" });

    // An arrow looks toward that side: the photo moves the other way.
    expect(keyToAction("ArrowRight", STAGE)).toEqual({
      type: "panBy",
      dx: -40,
      dy: 0,
    });
    expect(keyToAction("ArrowUp", STAGE)).toEqual({
      type: "panBy",
      dx: 0,
      dy: 30,
    });

    expect(keyToAction("a", STAGE)).toBeNull();
  });
});

describe("the lens", () => {
  it("centres the photo point under the pointer, magnified", () => {
    const fitted = fittedSize(PHOTO, STAGE, 0);
    const background = lensBackground(
      { u: 0.25, v: 0.75 },
      fitted,
      1,
      2.5,
      160,
    );

    expect(background.width).toBeCloseTo(fitted.width * 2.5, 9);
    expect(background.height).toBeCloseTo(fitted.height * 2.5, 9);

    // The lens centre (80, 80) shows the photo at (u, v).
    expect(80 - background.x).toBeCloseTo(0.25 * background.width, 9);
    expect(80 - background.y).toBeCloseTo(0.75 * background.height, 9);
  });

  it("reads the right spot of a turned photo", () => {
    const view: InspectorView = { ...INITIAL_VIEW, rotation: 90 };
    const fitted = fittedSize(PHOTO, STAGE, 90);

    // Turned 90° clockwise, the photo's top edge is on the right of the
    // screen: a point near the stage's right is near v = 0.
    const seen = pointToImage(
      { x: (fitted.height / 2) * 0.9, y: 0 },
      view,
      fitted,
    )!;

    expect(seen.u).toBeCloseTo(0.5, 9);
    expect(seen.v).toBeCloseTo(0.05, 9);
  });

  it("is not shown outside the photo", () => {
    const fitted = fittedSize(PHOTO, STAGE, 90);

    // Turned, the photo is narrower than the stage: the far left is empty.
    expect(
      pointToImage(corner(-1, -1), { ...INITIAL_VIEW, rotation: 90 }, fitted),
    ).toBeNull();
  });
});
