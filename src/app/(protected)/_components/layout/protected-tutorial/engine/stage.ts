import type { PlacementResult, Rect, SheetSide } from "./placement";
import {
  easeOutSite,
  flipTransform,
  morphRect,
  type MotionTimings,
} from "./transition";

/**
 * Writes the tour's geometry straight to the DOM: the card's transform, the
 * spotlight cutout and its glow.
 *
 * Imperative on purpose. Tracking runs inside ResizeObserver callbacks and
 * animation frames; a React state update there commits after the browser has
 * painted, so the card trailed its target by a frame on every frame of the
 * sidebar's collapse. Written here, the frame that moves the target also
 * moves the card. React still owns the copy and the classes, and never these
 * properties (they are not in its `style` props).
 *
 * Step changes run one tween for card and spotlight together, so both land
 * in the same frame; when the target moves mid-tween (tracking) the tween
 * simply heads to the new goal instead of finishing at the old one.
 */

interface StageElements {
  card: HTMLElement | null;
  /** The black rect of the SVG mask: the hole in the dark backdrop. */
  hole: SVGRectElement | null;
  /** The glowing outline drawn over the hole. */
  glow: HTMLElement | null;
}

interface Stage {
  /**
   * Desktop: the floating card at `placement`. With `glide`, a change of
   * side (the target moved and the card no longer fits where it was) slides
   * the card over instead of jumping.
   */
  placeCard(placement: PlacementResult, options?: { glide?: boolean }): void;
  /** Phone: the sheet on `side`. */
  placeSheet(side: SheetSide): void;
  /** Moves the spotlight to `rect` (null: no spotlight); `morph` tweens it there. */
  setSpotlight(rect: Rect | null, options?: { morph?: boolean }): void;
  /** Tweens the card from where it was drawn (`first`) to its current goal. */
  flipCardFrom(first: Rect | null, onDone: () => void): void;
  /** Fades the card in at its current goal. */
  enterCard(onDone: () => void): void;
  /** The card's drawn box (transform included). */
  cardRect(): Rect | null;
  dispose(): void;
}

const toRect = (dom: DOMRect): Rect => ({
  top: dom.top,
  left: dom.left,
  width: dom.width,
  height: dom.height,
});

const sameRect = (a: Rect | null, b: Rect | null) =>
  a === b ||
  (a !== null &&
    b !== null &&
    Math.abs(a.top - b.top) < 0.25 &&
    Math.abs(a.left - b.left) < 0.25 &&
    Math.abs(a.width - b.width) < 0.25 &&
    Math.abs(a.height - b.height) < 0.25);

/** Where the card's transform puts it: a translation (desktop) or none (sheet). */
type CardGoal = { left: number; top: number } | null;

const goalTransform = (goal: CardGoal) =>
  goal
    ? `translate3d(${Math.round(goal.left)}px, ${Math.round(goal.top)}px, 0)`
    : "";

/**
 * The flip reports done at this fraction of its time. The ease-out has
 * covered ~90% of the way by then, so the new copy starts fading in while
 * the card settles instead of after it: a shorter blank card.
 */
const FLIP_DONE_AT = 0.55;

interface CardTween {
  kind: "flip" | "enter";
  from: Rect | null;
  start: number;
  /** Moves without scaling: the copy is visible, so it must not squash. */
  translateOnly?: boolean;
  /** Called once, at `FLIP_DONE_AT` of a flip or at the end of an entrance. */
  onDone: (() => void) | null;
  /** The card's layout position with no transform (its static spot). */
  origin: { left: number; top: number };
}

function createStage(
  elements: () => StageElements,
  timings: MotionTimings,
  win: Window = window,
): Stage {
  let cardGoal: CardGoal = null;
  let cardTween: CardTween | null = null;
  let placementKind: string | null = null;

  // Spotlight: the rect on screen, the rect it is heading to, the tween.
  let drawn: Rect | null = null;
  let goal: Rect | null = null;
  let spotTween: { from: Rect | null; start: number } | null = null;

  let frame: number | null = null;
  let fallback: ReturnType<typeof setTimeout> | null = null;

  const writeSpotlight = (rect: Rect | null) => {
    const { hole, glow } = elements();
    const shown = rect !== null && rect.width > 0.5 && rect.height > 0.5;

    drawn = rect;

    if (hole) {
      hole.setAttribute("x", String(rect?.left ?? 0));
      hole.setAttribute("y", String(rect?.top ?? 0));
      hole.setAttribute("width", String(shown ? rect.width : 0));
      hole.setAttribute("height", String(shown ? rect.height : 0));
    }

    if (glow) {
      if (shown) {
        glow.style.transform = `translate3d(${rect.left}px, ${rect.top}px, 0)`;
        glow.style.width = `${rect.width}px`;
        glow.style.height = `${rect.height}px`;
      }

      glow.style.opacity = shown ? "1" : "0";

      // The marker the browser suites read: present only while a target is lit.
      if (goal) glow.setAttribute("data-tutorial-spotlight", "");
      else glow.removeAttribute("data-tutorial-spotlight");
    }
  };

  /** The card at rest on its goal. */
  const writeCardAtGoal = (card: HTMLElement) => {
    const transform = goalTransform(cardGoal);

    if (card.style.transform !== transform) card.style.transform = transform;
    if (card.style.opacity) card.style.opacity = "";
    if (card.style.transformOrigin) card.style.transformOrigin = "";
  };

  /** One frame of the card tween at eased progress `eased`. */
  const writeCardTween = (
    card: HTMLElement,
    tween: CardTween,
    eased: number,
  ) => {
    const base = goalTransform(cardGoal);

    if (tween.kind === "enter") {
      card.style.opacity = String(eased);
      card.style.transform = `${base} translateY(${(1 - eased) * 6}px)`.trim();
      return;
    }

    if (!tween.from) {
      writeCardAtGoal(card);
      return;
    }

    // The layout box at the goal. Sizes from offsets (they ignore
    // transforms); the static spot was read once when the tween started.
    const last: Rect = {
      left: tween.origin.left + (cardGoal?.left ?? 0),
      top: tween.origin.top + (cardGoal?.top ?? 0),
      width: card.offsetWidth,
      height: card.offsetHeight,
    };
    const morphed = morphRect(tween.from, last, eased) as Rect;
    const now = tween.translateOnly
      ? { ...morphed, width: last.width, height: last.height }
      : morphed;
    const { dx, dy, sx, sy } = flipTransform(now, last);

    card.style.transformOrigin = "0 0";
    card.style.transform =
      `${base} translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`.trim();
  };

  const finishCard = () => {
    const tween = cardTween;

    cardTween = null;

    if (fallback !== null) clearTimeout(fallback);
    fallback = null;

    const { card } = elements();

    if (card) writeCardAtGoal(card);

    tween?.onDone?.();
  };

  const tick = () => {
    frame = null;

    const now = win.performance.now();
    const duration = Math.max(1, timings.moveMs);

    if (spotTween) {
      const progress = Math.min(1, (now - spotTween.start) / duration);

      if (progress >= 1) {
        spotTween = null;
        writeSpotlight(goal);
      } else {
        writeSpotlight(morphRect(spotTween.from, goal, easeOutSite(progress)));
      }
    }

    if (cardTween) {
      const { card } = elements();
      const length =
        cardTween.kind === "enter" ? Math.max(1, timings.enterMs) : duration;
      const progress = Math.min(1, (now - cardTween.start) / length);

      if (!card || progress >= 1) {
        finishCard();
      } else {
        writeCardTween(card, cardTween, easeOutSite(progress));

        if (
          cardTween.kind === "flip" &&
          progress >= FLIP_DONE_AT &&
          cardTween.onDone
        ) {
          const done = cardTween.onDone;

          cardTween.onDone = null;
          done();
        }
      }
    }

    if (spotTween || cardTween) frame = win.requestAnimationFrame(tick);
  };

  const ensureFrame = () => {
    if (frame === null) frame = win.requestAnimationFrame(tick);
  };

  const startCardTween = (
    tween: Omit<CardTween, "start" | "origin">,
    length: number,
  ) => {
    const { card } = elements();

    // A superseded tween's callback is dropped, not fired: it belongs to a
    // step that is gone, and firing it would end the NEW move early (the new
    // copy fading in while the card still travels).
    if (cardTween) {
      cardTween.onDone = null;
      finishCard();
    }

    if (!card || length <= 0) {
      if (card) writeCardAtGoal(card);
      tween.onDone?.();
      return;
    }

    // Read at rest on the goal, before the first tween frame is written.
    writeCardAtGoal(card);

    const rest = card.getBoundingClientRect();
    const origin = {
      left: rest.left - (cardGoal?.left ?? 0),
      top: rest.top - (cardGoal?.top ?? 0),
    };

    cardTween = { ...tween, start: win.performance.now(), origin };
    // Drawn now, at progress 0: the first painted frame is the start, not the end.
    writeCardTween(card, cardTween, 0);
    // A hidden tab runs no frames; the tour must still move on.
    fallback = setTimeout(finishCard, length + 150);
    ensureFrame();
  };

  const setGoal = (next: CardGoal) => {
    const { card } = elements();

    cardGoal = next;

    // Mid-tween the next frame reads the new goal; at rest, apply it now.
    if (card && !cardTween) writeCardAtGoal(card);
  };

  return {
    placeCard(placement, options) {
      const { card } = elements();
      const sideChanged =
        placementKind !== null && placementKind !== placement.placement;

      placementKind = placement.placement;

      if (
        card &&
        sideChanged &&
        options?.glide &&
        !cardTween &&
        timings.moveMs > 0
      ) {
        // Same copy, visible: translate only (its own size, no scale).
        const drawnBox = card.getBoundingClientRect();
        const from = {
          left: drawnBox.left,
          top: drawnBox.top,
          width: card.offsetWidth,
          height: card.offsetHeight,
        };

        cardGoal = {
          left: Math.round(placement.left),
          top: Math.round(placement.top),
        };
        startCardTween(
          { kind: "flip", from, onDone: null, translateOnly: true },
          timings.moveMs,
        );
      } else {
        setGoal({
          left: Math.round(placement.left),
          top: Math.round(placement.top),
        });
      }

      if (!card) return;

      const maxHeight = Number.isFinite(placement.maxHeight)
        ? `${placement.maxHeight}px`
        : "";

      if (card.style.maxHeight !== maxHeight) card.style.maxHeight = maxHeight;
      if (card.dataset.placement !== placement.placement)
        card.dataset.placement = placement.placement;
    },

    placeSheet(side) {
      const { card } = elements();

      placementKind = null;
      setGoal(null);

      if (!card) return;

      if (card.style.maxHeight) card.style.maxHeight = "";

      const value = `sheet-${side}`;

      if (card.dataset.placement !== value) card.dataset.placement = value;
    },

    setSpotlight(rect, options) {
      goal = rect;

      if (options?.morph && timings.moveMs > 0) {
        spotTween = { from: drawn, start: win.performance.now() };
        ensureFrame();
        return;
      }

      // Mid-morph the tween heads to the new goal by itself.
      if (spotTween) return;

      const { glow } = elements();
      const markerStale =
        glow !== null &&
        Boolean(goal) !== glow.hasAttribute("data-tutorial-spotlight");

      if (!sameRect(drawn, rect) || markerStale) writeSpotlight(rect);
    },

    flipCardFrom(first, onDone) {
      const { card } = elements();

      if (!card || !first) {
        onDone();
        return;
      }

      startCardTween({ kind: "flip", from: first, onDone }, timings.moveMs);
    },

    enterCard(onDone) {
      startCardTween({ kind: "enter", from: null, onDone }, timings.enterMs);
    },

    cardRect() {
      const { card } = elements();

      return card ? toRect(card.getBoundingClientRect()) : null;
    },

    dispose() {
      if (frame !== null) win.cancelAnimationFrame(frame);
      frame = null;
      if (fallback !== null) clearTimeout(fallback);
      fallback = null;
      cardTween = null;
      spotTween = null;
    },
  };
}

export { createStage };
export type { Stage, StageElements };
