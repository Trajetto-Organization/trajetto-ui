/**
 * The arithmetic of the photo inspector, pure so it can be tested.
 *
 * Coordinates are in CSS pixels relative to the CENTRE of the stage. The
 * image is drawn centred and moved by one transform,
 * `translate(pan) rotate(rotation) scale(zoom)`, so nothing depends on the
 * stage's scroll position: the old viewer scaled inside an `overflow-auto`
 * box, and the half of the photo that grew up and left was overflow no
 * scrollbar could reach (DLVB-05).
 */

type Rotation = 0 | 90 | 180 | 270;

interface Size {
  width: number;
  height: number;
}

interface Point {
  x: number;
  y: number;
}

interface InspectorView {
  zoom: number;
  rotation: Rotation;
  pan: Point;
}

/** What the reducer needs to know about the page to keep the image in bounds. */
interface InspectorBounds {
  /** The photo's own pixels; null until it loads. */
  natural: Size | null;
  stage: Size;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

/** The steps + and − land on: three presses reach 3×, the signature size. */
const ZOOM_STEPS = [1, 1.5, 2, 3, 4];

/** How far an arrow key moves the photo, as a share of the stage. */
const KEY_PAN_SHARE = 0.1;

const INITIAL_VIEW: InspectorView = {
  zoom: 1,
  rotation: 0,
  pan: { x: 0, y: 0 },
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const isTurned = (rotation: Rotation): boolean => rotation % 180 !== 0;

/** Exact sine and cosine for the four quarter turns (no 6e-17 drift). */
function quarterTurn(rotation: Rotation): { cos: number; sin: number } {
  switch (rotation) {
    case 90:
      return { cos: 0, sin: 1 };
    case 180:
      return { cos: -1, sin: 0 };
    case 270:
      return { cos: 0, sin: -1 };
    default:
      return { cos: 1, sin: 0 };
  }
}

/**
 * The image's size at zoom 1, UNROTATED, so that once rotated it fits the
 * stage whole. Turning a landscape photo 90° used to overflow the box.
 */
function fittedSize(natural: Size, stage: Size, rotation: Rotation): Size {
  if (natural.width <= 0 || natural.height <= 0) return { width: 0, height: 0 };

  const visual = isTurned(rotation)
    ? { width: natural.height, height: natural.width }
    : natural;

  const scale = Math.min(
    stage.width / visual.width,
    stage.height / visual.height,
  );

  return { width: natural.width * scale, height: natural.height * scale };
}

/** The box the image occupies on screen: rotated, then zoomed. */
function visualSize(fitted: Size, rotation: Rotation, zoom: number): Size {
  const turned = isTurned(rotation);

  return {
    width: (turned ? fitted.height : fitted.width) * zoom,
    height: (turned ? fitted.width : fitted.height) * zoom,
  };
}

/**
 * How far the image may move on each axis: until its edge meets the stage's
 * edge, and not a pixel further. Exactly far enough to bring every corner of
 * a zoomed photo into view, and never so far that the stage shows a gap.
 */
function panLimit(visual: Size, stage: Size): Point {
  return {
    x: Math.max(0, (visual.width - stage.width) / 2),
    y: Math.max(0, (visual.height - stage.height) / 2),
  };
}

function clampPan(pan: Point, limit: Point): Point {
  // `|| 0` turns the -0 of clamp(-n, -0, 0) into 0.
  return {
    x: clamp(pan.x, -limit.x, limit.x) || 0,
    y: clamp(pan.y, -limit.y, limit.y) || 0,
  };
}

/**
 * The pan that keeps the stage point `focus` over the same spot of the photo
 * while the zoom goes `from` → `to` — so a double click or a pinch zooms INTO
 * what is under the finger, not into the middle of the picture.
 */
function panForZoomAt(
  pan: Point,
  focus: Point,
  from: number,
  to: number,
): Point {
  const ratio = to / from;

  return {
    x: focus.x - (focus.x - pan.x) * ratio,
    y: focus.y - (focus.y - pan.y) * ratio,
  };
}

/**
 * Where on the photo a stage point falls, as (u, v) in 0..1 of the UNROTATED
 * image, or null when the point is outside it. The lens reads the photo here.
 */
function pointToImage(
  point: Point,
  view: InspectorView,
  fitted: Size,
): { u: number; v: number } | null {
  if (fitted.width <= 0 || fitted.height <= 0) return null;

  const { cos, sin } = quarterTurn(view.rotation);

  const dx = point.x - view.pan.x;
  const dy = point.y - view.pan.y;

  // Undo the clockwise rotation, then the zoom.
  const localX = (dx * cos + dy * sin) / view.zoom;
  const localY = (-dx * sin + dy * cos) / view.zoom;

  const u = localX / fitted.width + 0.5;
  const v = localY / fitted.height + 0.5;

  if (u < 0 || u > 1 || v < 0 || v > 1) return null;

  return { u, v };
}

/**
 * The lens's background, so the photo point (u, v) sits at its centre, `factor`
 * times larger than the photo is drawn. The lens element is rotated with the
 * photo, so the background is laid out unrotated, like the image itself.
 */
function lensBackground(
  uv: { u: number; v: number },
  fitted: Size,
  zoom: number,
  factor: number,
  lensSize: number,
): { width: number; height: number; x: number; y: number } {
  const width = fitted.width * zoom * factor;
  const height = fitted.height * zoom * factor;

  const radius = lensSize / 2;

  return { width, height, x: radius - uv.u * width, y: radius - uv.v * height };
}

type InspectorAction =
  | { type: "zoomIn" }
  | { type: "zoomOut" }
  | { type: "zoomTo"; zoom: number; focus?: Point }
  /** Relative to the zoom at the time it applies: a pinch or a wheel notch. */
  | { type: "zoomBy"; factor: number; focus?: Point }
  | { type: "rotate" }
  | { type: "reset" }
  | { type: "panBy"; dx: number; dy: number }
  | { type: "setPan"; pan: Point };

/** The next step up or down from any zoom, including a pinch's in-between. */
function stepZoom(zoom: number, direction: 1 | -1): number {
  if (direction > 0) {
    return ZOOM_STEPS.find((step) => step > zoom + 1e-6) ?? MAX_ZOOM;
  }

  return (
    [...ZOOM_STEPS].reverse().find((step) => step < zoom - 1e-6) ?? MIN_ZOOM
  );
}

/** Keeps the pan inside the limit of the view it ends in. */
function settle(view: InspectorView, bounds: InspectorBounds): InspectorView {
  if (!bounds.natural) return { ...view, pan: { x: 0, y: 0 } };

  const fitted = fittedSize(bounds.natural, bounds.stage, view.rotation);
  const limit = panLimit(
    visualSize(fitted, view.rotation, view.zoom),
    bounds.stage,
  );

  return { ...view, pan: clampPan(view.pan, limit) };
}

function inspectorReducer(
  view: InspectorView,
  action: InspectorAction,
  bounds: InspectorBounds,
): InspectorView {
  switch (action.type) {
    case "zoomIn":
    case "zoomOut":
    case "zoomTo":
    case "zoomBy": {
      const target =
        action.type === "zoomTo"
          ? clamp(action.zoom, MIN_ZOOM, MAX_ZOOM)
          : action.type === "zoomBy"
            ? clamp(view.zoom * action.factor, MIN_ZOOM, MAX_ZOOM)
            : stepZoom(view.zoom, action.type === "zoomIn" ? 1 : -1);

      const focus =
        action.type === "zoomTo" || action.type === "zoomBy"
          ? action.focus
          : undefined;

      const pan = focus
        ? panForZoomAt(view.pan, focus, view.zoom, target)
        : // Buttons zoom around the middle of what is on screen.
          {
            x: (view.pan.x * target) / view.zoom,
            y: (view.pan.y * target) / view.zoom,
          };

      return settle({ ...view, zoom: target, pan }, bounds);
    }

    case "rotate":
      // Centred again: the part that was on screen is somewhere else now.
      return settle(
        {
          ...view,
          rotation: ((view.rotation + 90) % 360) as Rotation,
          pan: { x: 0, y: 0 },
        },
        bounds,
      );

    case "reset":
      return INITIAL_VIEW;

    case "panBy":
      return settle(
        {
          ...view,
          pan: { x: view.pan.x + action.dx, y: view.pan.y + action.dy },
        },
        bounds,
      );

    case "setPan":
      return settle({ ...view, pan: action.pan }, bounds);

    default:
      return view;
  }
}

/**
 * The keyboard, when the photo has focus: + and − zoom, R turns, 0 restores,
 * and the arrows look toward that side of the photo. Null for any other key,
 * which is left to the page.
 */
function keyToAction(key: string, stage: Size): InspectorAction | null {
  const stepX = stage.width * KEY_PAN_SHARE;
  const stepY = stage.height * KEY_PAN_SHARE;

  switch (key) {
    case "+":
    case "=":
      return { type: "zoomIn" };
    case "-":
    case "_":
      return { type: "zoomOut" };
    case "r":
    case "R":
      return { type: "rotate" };
    case "0":
      return { type: "reset" };
    case "ArrowLeft":
      return { type: "panBy", dx: stepX, dy: 0 };
    case "ArrowRight":
      return { type: "panBy", dx: -stepX, dy: 0 };
    case "ArrowUp":
      return { type: "panBy", dx: 0, dy: stepY };
    case "ArrowDown":
      return { type: "panBy", dx: 0, dy: -stepY };
    default:
      return null;
  }
}

function isInitialView(view: InspectorView): boolean {
  return (
    view.zoom === INITIAL_VIEW.zoom &&
    view.rotation === INITIAL_VIEW.rotation &&
    view.pan.x === 0 &&
    view.pan.y === 0
  );
}

/** The one transform the photo is drawn with. */
function imageTransform(view: InspectorView): string {
  return (
    `translate(-50%, -50%) translate(${view.pan.x}px, ${view.pan.y}px) ` +
    `rotate(${view.rotation}deg) scale(${view.zoom})`
  );
}

export {
  INITIAL_VIEW,
  MAX_ZOOM,
  MIN_ZOOM,
  ZOOM_STEPS,
  clampPan,
  fittedSize,
  imageTransform,
  inspectorReducer,
  isInitialView,
  keyToAction,
  lensBackground,
  panForZoomAt,
  panLimit,
  pointToImage,
  stepZoom,
  visualSize,
};
export type {
  InspectorAction,
  InspectorBounds,
  InspectorView,
  Point,
  Rotation,
  Size,
};
