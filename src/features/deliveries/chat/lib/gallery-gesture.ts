/**
 * The drag on a full-screen photo, as plain numbers.
 *
 * Pure and isolated for the same reason `audio-scrub` is: the pointer handler
 * that follows the finger and the one that decides what the finger meant have
 * to agree, and two lookalike formulas spread over an event-handler file is
 * exactly how they stop agreeing.
 *
 * The axis decision is deliberately its own step, taken before any offset is
 * computed. Zoom is out of scope for this round, and this is the seam it
 * plugs into later: a pinch — or a drag inside an already-zoomed photo — gets
 * to claim the pointer before the gallery ever asks which way the finger went.
 *
 * No DOM, no pointer events, no React, no reading of any element.
 */

/** Which way a drag ended up going, once it has travelled far enough. */
type GestureAxis = "horizontal" | "vertical";

/** Travel, in pixels, before a drag is allowed to pick an axis at all. */
const AXIS_LOCK_PX = 12;

/** Fraction of the stage a horizontal drag has to cross to change photo. */
const SWIPE_COMMIT_RATIO = 0.22;

/** A flick shorter than that still counts, above this speed. Px per ms. */
const SWIPE_COMMIT_VELOCITY = 0.45;

/** ...but never a flick this short: that is a tap with a shaky hand. */
const SWIPE_MIN_FLICK_PX = 24;

/**
 * How much of a drag survives when there is nothing on that side.
 *
 * The gallery does not wrap, and an edge that simply refuses to move reads as
 * a broken screen. Letting a quarter of the drag through says "this is the
 * end" with the gesture itself.
 */
const EDGE_RESISTANCE = 0.25;

/** Fraction of the stage height that maps to a fully dismissed photo. */
const DISMISS_RANGE_RATIO = 0.4;

/** Past this much of that range, letting go throws the photo away. */
const DISMISS_COMMIT_PROGRESS = 0.28;

/** Or below it, at this speed. Px per ms. */
const DISMISS_COMMIT_VELOCITY = 0.5;

/** ...with the same floor a horizontal flick has. */
const DISMISS_MIN_FLICK_PX = 24;

/** The photo never shrinks past this while it is being pulled away. */
const MIN_DISMISS_SCALE = 0.7;

/** How far the finger has travelled since it went down. */
interface DragVector {
  dx: number;
  dy: number;
}

/** What the gallery has on either side of the photo being dragged. */
interface GalleryEdges {
  canGoPrevious: boolean;
  canGoNext: boolean;
}

/** What the current slide should look like at a given dismiss progress. */
interface DismissStyle {
  /** Applied to the photo: it pulls away from the screen as it leaves. */
  scale: number;

  /** Applied to the backdrop: the conversation shows through behind it. */
  backdropOpacity: number;
}

const clamp01 = (value: number): number =>
  Number.isFinite(value) ? Math.min(Math.max(value, 0), 1) : 0;

/**
 * Which way this drag is going — `null` while it is still too short to say.
 *
 * Locking on the first decisive pixels and not re-deciding afterwards is what
 * stops a swipe that drifts downwards from turning into a dismiss halfway
 * through. A tie goes to horizontal: paging is the common gesture, and
 * dismissing by accident costs the reader their place.
 */
const resolveGestureAxis = (
  { dx, dy }: DragVector,
  lockPx: number = AXIS_LOCK_PX,
): GestureAxis | null => {
  const horizontal = Math.abs(dx);
  const vertical = Math.abs(dy);

  if (!Number.isFinite(horizontal) || !Number.isFinite(vertical)) return null;
  if (Math.max(horizontal, vertical) < lockPx) return null;

  return horizontal >= vertical ? "horizontal" : "vertical";
};

/**
 * The horizontal travel actually applied to the track, resisted at the ends.
 *
 * Dragging right uncovers what came before; dragging left, what comes next.
 */
const resolveTrackOffset = (dx: number, edges: GalleryEdges): number => {
  if (!Number.isFinite(dx) || dx === 0) return 0;

  const blocked = dx > 0 ? !edges.canGoPrevious : !edges.canGoNext;

  return blocked ? dx * EDGE_RESISTANCE : dx;
};

/**
 * What a released horizontal drag meant: -1 previous, +1 next, 0 stay.
 *
 * An edge answers 0 rather than a step nobody can take, so the caller never
 * has to guard the ends a second time.
 */
const resolveSwipeCommit = ({
  dx,
  width,
  elapsedMs,
  edges,
}: {
  dx: number;
  width: number;
  elapsedMs: number;
  edges: GalleryEdges;
}): -1 | 0 | 1 => {
  if (!Number.isFinite(dx) || width <= 0) return 0;

  const distance = Math.abs(dx);
  const velocity = distance / Math.max(elapsedMs, 1);

  const committed =
    distance >= width * SWIPE_COMMIT_RATIO ||
    (distance >= SWIPE_MIN_FLICK_PX && velocity >= SWIPE_COMMIT_VELOCITY);

  if (!committed) return 0;

  const delta: -1 | 1 = dx > 0 ? -1 : 1;

  if (delta === -1 && !edges.canGoPrevious) return 0;
  if (delta === 1 && !edges.canGoNext) return 0;

  return delta;
};

/** How far along the dismiss a vertical drag has got: 0 to 1, either way. */
const resolveDismissProgress = (dy: number, height: number): number =>
  height > 0 ? clamp01(Math.abs(dy) / (height * DISMISS_RANGE_RATIO)) : 0;

/**
 * The photo shrinks, the backdrop clears.
 *
 * Only `transform` and `opacity` come out of here: both are composited by the
 * browser, so following a finger with them never triggers layout or paint.
 */
const resolveDismissStyle = (progress: number): DismissStyle => {
  const settled = clamp01(progress);

  return {
    scale: 1 - settled * (1 - MIN_DISMISS_SCALE),
    backdropOpacity: 1 - settled,
  };
};

/** Whether a released vertical drag should throw the photo away. */
const resolveDismissCommit = ({
  dy,
  height,
  elapsedMs,
}: {
  dy: number;
  height: number;
  elapsedMs: number;
}): boolean => {
  if (!Number.isFinite(dy) || height <= 0) return false;

  const distance = Math.abs(dy);
  const velocity = distance / Math.max(elapsedMs, 1);

  return (
    resolveDismissProgress(dy, height) >= DISMISS_COMMIT_PROGRESS ||
    (distance >= DISMISS_MIN_FLICK_PX && velocity >= DISMISS_COMMIT_VELOCITY)
  );
};

export {
  AXIS_LOCK_PX,
  SWIPE_COMMIT_RATIO,
  SWIPE_COMMIT_VELOCITY,
  SWIPE_MIN_FLICK_PX,
  EDGE_RESISTANCE,
  DISMISS_RANGE_RATIO,
  DISMISS_COMMIT_PROGRESS,
  DISMISS_COMMIT_VELOCITY,
  MIN_DISMISS_SCALE,
  clamp01,
  resolveGestureAxis,
  resolveTrackOffset,
  resolveSwipeCommit,
  resolveDismissProgress,
  resolveDismissStyle,
  resolveDismissCommit,
};

export type { GestureAxis, DragVector, GalleryEdges, DismissStyle };
