import type { Rect } from "./placement";

/**
 * How the card goes from one step to the next, as a pure state machine.
 *
 * The old card swapped title and text the moment "Próximo" was pressed and
 * then jumped: the next step's copy showed for a frame at the previous
 * step's spot (the old placement was still set when the new step resolved).
 * Here the copy on screen (`displayed`) only changes while it is hidden:
 *
 *   closed ──REQUEST──▶ resolving ──RESOLVED──▶ entering ──ENTER_DONE──▶ shown
 *   shown ──REQUEST──▶ leaving (old copy fades out, card stays, target is
 *     looked up and scrolled into view) ──CONTENT_HIDDEN + RESOLVED──▶ moving
 *     (new copy, hidden; card and spotlight move) ──MOVE_DONE──▶ shown
 *
 * A request carries an id, not a step index: dropping an optional step keeps
 * the index and changes the step.
 */

type TransitionPhase =
  "closed" | "resolving" | "entering" | "shown" | "leaving" | "moving";

interface Resolved<P> {
  id: number;
  payload: P;
}

interface TransitionState<P> {
  phase: TransitionPhase;
  /** The request being resolved (or shown). */
  requested: number | null;
  /** Resolved while the old copy was still fading out. */
  pending: Resolved<P> | null;
  /** What the card shows. */
  displayed: Resolved<P> | null;
  /** The copy is faded out (or fading out). */
  contentHidden: boolean;
}

type TransitionEvent<P> =
  | { type: "REQUEST"; id: number }
  | { type: "RESOLVED"; id: number; payload: P }
  | { type: "CONTENT_HIDDEN" }
  /** `id`: the request the finished motion was for; a stale one is ignored. */
  | { type: "ENTER_DONE"; id?: number }
  | { type: "MOVE_DONE"; id?: number }
  | { type: "CLOSE" };

function initialTransitionState<P>(): TransitionState<P> {
  return {
    phase: "closed",
    requested: null,
    pending: null,
    displayed: null,
    contentHidden: true,
  };
}

/** Swaps in the pending copy once the old one is out of sight. */
function maybeSwap<P>(state: TransitionState<P>): TransitionState<P> {
  if (state.phase !== "leaving" || !state.contentHidden || !state.pending)
    return state;

  return {
    ...state,
    phase: "moving",
    displayed: state.pending,
    pending: null,
    contentHidden: true,
  };
}

function transitionReducer<P>(
  state: TransitionState<P>,
  event: TransitionEvent<P>,
): TransitionState<P> {
  switch (event.type) {
    case "CLOSE":
      return initialTransitionState<P>();

    case "REQUEST": {
      if (event.id === state.requested && state.phase !== "closed")
        return state;

      switch (state.phase) {
        case "closed":
        case "resolving":
          return {
            ...initialTransitionState<P>(),
            phase: "resolving",
            requested: event.id,
          };
        case "entering":
        case "shown":
          return {
            ...state,
            phase: "leaving",
            requested: event.id,
            pending: null,
            contentHidden: false,
          };
        case "leaving":
          return { ...state, requested: event.id, pending: null };
        case "moving":
          // The new copy has not faded in yet: it is already out of sight.
          return {
            ...state,
            phase: "leaving",
            requested: event.id,
            pending: null,
            contentHidden: true,
          };
      }

      return state;
    }

    case "RESOLVED": {
      if (event.id !== state.requested) return state;

      const resolved = { id: event.id, payload: event.payload };

      if (state.phase === "resolving") {
        return {
          ...state,
          phase: "entering",
          displayed: resolved,
          pending: null,
          contentHidden: false,
        };
      }

      if (state.phase === "leaving")
        return maybeSwap({ ...state, pending: resolved });

      return state;
    }

    case "CONTENT_HIDDEN":
      return state.phase === "leaving"
        ? maybeSwap({ ...state, contentHidden: true })
        : state;

    case "ENTER_DONE":
      if (event.id !== undefined && event.id !== state.displayed?.id)
        return state;
      return state.phase === "entering" ? { ...state, phase: "shown" } : state;

    case "MOVE_DONE":
      // A move started for an earlier step (fast presses) must not reveal
      // the copy of the current one mid-flight.
      if (event.id !== undefined && event.id !== state.displayed?.id)
        return state;
      return state.phase === "moving"
        ? { ...state, phase: "shown", contentHidden: false }
        : state;
  }

  return state;
}

/** The card is on screen (it is laid out, hidden, while the first step resolves). */
function cardVisible(state: TransitionState<unknown>): boolean {
  return state.phase !== "closed" && state.phase !== "resolving";
}

interface MotionTimings {
  /** Old copy fading out. */
  contentOutMs: number;
  /** New copy fading in. */
  contentInMs: number;
  /** Card and spotlight going to the new step. */
  moveMs: number;
  /** First appearance. */
  enterMs: number;
  easing: string;
}

/** The site's ease-out (`ease-site`). */
const MOTION_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

/** Durations of the tour's motion; all zero for someone who asked for less motion. */
function motionTimings(reducedMotion: boolean): MotionTimings {
  if (reducedMotion) {
    return {
      contentOutMs: 0,
      contentInMs: 0,
      moveMs: 0,
      enterMs: 0,
      easing: "linear",
    };
  }

  return {
    contentOutMs: 110,
    contentInMs: 180,
    moveMs: 240,
    enterMs: 200,
    easing: MOTION_EASING,
  };
}

/** cubic-bezier(0.22, 1, 0.36, 1) sampled for JS tweens (Newton on x, then y). */
function easeOutSite(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;

  const [x1, y1, x2, y2] = [0.22, 1, 0.36, 1];
  const bezier = (a: number, b: number, u: number) =>
    3 * a * u * (1 - u) ** 2 + 3 * b * u ** 2 * (1 - u) + u ** 3;
  const derivative = (a: number, b: number, u: number) =>
    3 * a * (1 - u) ** 2 + 6 * (b - a) * u * (1 - u) + 3 * (1 - b) * u ** 2;

  let u = t;

  for (let i = 0; i < 8; i += 1) {
    const slope = derivative(x1, x2, u);

    if (Math.abs(slope) < 1e-6) break;

    u -= (bezier(x1, x2, u) - t) / slope;
    u = Math.min(Math.max(u, 0), 1);
  }

  return bezier(y1, y2, u);
}

/** A zero-size rect at the center of `rect`: where a spotlight grows from or shrinks to. */
function collapsedAt(rect: Rect): Rect {
  return {
    top: rect.top + rect.height / 2,
    left: rect.left + rect.width / 2,
    width: 0,
    height: 0,
  };
}

/**
 * The spotlight between two steps at `progress` (0..1, eased). A missing
 * side is a point at the other's center, so a spotlight grows from or
 * shrinks to its own middle instead of popping.
 */
function morphRect(
  from: Rect | null,
  to: Rect | null,
  progress: number,
): Rect | null {
  if (!from && !to) return null;

  const start = from ?? collapsedAt(to as Rect);
  const end = to ?? collapsedAt(from as Rect);
  const mix = (a: number, b: number) => a + (b - a) * progress;

  return {
    top: mix(start.top, end.top),
    left: mix(start.left, end.left),
    width: mix(start.width, end.width),
    height: mix(start.height, end.height),
  };
}

/**
 * The FLIP transform that draws a box laid out at `last` where `first` was:
 * translate by the offset, scale by the size ratio (origin top left).
 */
function flipTransform(
  first: Rect,
  last: Rect,
): { dx: number; dy: number; sx: number; sy: number } {
  return {
    dx: first.left - last.left,
    dy: first.top - last.top,
    sx: last.width > 0 ? first.width / last.width : 1,
    sy: last.height > 0 ? first.height / last.height : 1,
  };
}

export {
  MOTION_EASING,
  cardVisible,
  collapsedAt,
  easeOutSite,
  flipTransform,
  initialTransitionState,
  morphRect,
  motionTimings,
  transitionReducer,
};
export type {
  MotionTimings,
  Resolved,
  TransitionEvent,
  TransitionPhase,
  TransitionState,
};
