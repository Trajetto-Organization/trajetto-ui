/**
 * Where the tour card goes, as a pure function of rectangles.
 *
 * The old engine put the card on the step's fixed side and only clamped it to
 * the viewport. On a 1366x768 notebook at 125% (1093x614 CSS pixels) a 448px
 * card on a fixed side landed on top of the very thing it was describing.
 * Here every candidate side is tried and the first one that fits AND leaves
 * the target uncovered wins — first at the card's full height, then at its
 * compact height; only when neither fits does the card dock in a corner.
 *
 * `card.height` is the card's NATURAL height (its content, unclamped). The
 * clamps are inputs, not measurements: feeding back the clamped box made the
 * result depend on itself (docked → compact → a side fits → full → docked…)
 * and the card flickered between two spots on every frame.
 */

type CardSide = "top" | "bottom" | "left" | "right";

type PreferredPlacement = CardSide | "center";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface Size {
  width: number;
  height: number;
}

interface PlacementInput {
  /** The target's visible rectangle (viewport coordinates), or null for a centered step. */
  target: Rect | null;
  /** Natural size: the height the content wants, before any max-height. */
  card: Size;
  viewport: Size;
  /** Max height of the full card (70vh in CSS px). Omitted = unclamped. */
  maxHeight?: number;
  /** Max height of the compact card (45vh). Omitted = same as `maxHeight`. */
  compactMaxHeight?: number;
  preferred?: PreferredPlacement;
  /** Space between the card and the target. */
  gap?: number;
  /** Space kept free at the viewport edges. */
  margin?: number;
}

interface PlacementResult {
  top: number;
  left: number;
  placement: CardSide | "center" | "docked";
  /** True only when no position could avoid covering the target. */
  overlapsTarget: boolean;
  /** The card renders at `compactMaxHeight` instead of `maxHeight`. */
  compact: boolean;
  /** The max-height the card must render with for this placement to hold. */
  maxHeight: number;
}

const OPPOSITE: Record<CardSide, CardSide> = {
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left",
};

const DEFAULT_GAP = 12;
const DEFAULT_MARGIN = 12;

/** Preferred side, its opposite, then the rest in a fixed order. */
function candidateSides(preferred: CardSide | undefined): CardSide[] {
  const first = preferred ?? "bottom";
  const order: CardSide[] = [
    first,
    OPPOSITE[first],
    "right",
    "left",
    "bottom",
    "top",
  ];

  return order.filter((side, index) => order.indexOf(side) === index);
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;

  return Math.min(Math.max(value, min), max);
}

/** Position on `side`, centered on the cross axis and clamped to the viewport there. */
function positionOn(
  side: CardSide,
  target: Rect,
  card: Size,
  viewport: Size,
  gap: number,
  margin: number,
): { top: number; left: number } {
  const crossLeft = clamp(
    target.left + target.width / 2 - card.width / 2,
    margin,
    viewport.width - card.width - margin,
  );
  const crossTop = clamp(
    target.top + target.height / 2 - card.height / 2,
    margin,
    viewport.height - card.height - margin,
  );

  switch (side) {
    case "top":
      return { top: target.top - card.height - gap, left: crossLeft };
    case "bottom":
      return { top: target.top + target.height + gap, left: crossLeft };
    case "left":
      return { top: crossTop, left: target.left - card.width - gap };
    case "right":
      return { top: crossTop, left: target.left + target.width + gap };
  }
}

function fitsViewport(
  position: { top: number; left: number },
  card: Size,
  viewport: Size,
  margin: number,
): boolean {
  return (
    position.top >= margin &&
    position.left >= margin &&
    position.top + card.height <= viewport.height - margin &&
    position.left + card.width <= viewport.width - margin
  );
}

/** Overlapping area of two rectangles (0 when they only touch). */
function overlapArea(a: Rect, b: Rect): number {
  const width =
    Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
  const height =
    Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);

  return width > 0 && height > 0 ? width * height : 0;
}

function centered(
  card: Size,
  viewport: Size,
  margin: number,
  maxHeight: number,
): PlacementResult {
  return {
    top: clamp(
      viewport.height / 2 - card.height / 2,
      margin,
      viewport.height - card.height - margin,
    ),
    left: clamp(
      viewport.width / 2 - card.width / 2,
      margin,
      viewport.width - card.width - margin,
    ),
    placement: "center",
    overlapsTarget: false,
    compact: false,
    maxHeight,
  };
}

/** The corner that covers the least of the target, the farthest one on a tie. */
function docked(
  target: Rect,
  card: Size,
  viewport: Size,
  margin: number,
  maxHeight: number,
): PlacementResult {
  const right = Math.max(margin, viewport.width - card.width - margin);
  const bottom = Math.max(margin, viewport.height - card.height - margin);

  const corners = [
    { top: margin, left: margin },
    { top: margin, left: right },
    { top: bottom, left: margin },
    { top: bottom, left: right },
  ];

  const targetCenter = {
    x: target.left + target.width / 2,
    y: target.top + target.height / 2,
  };

  const scored = corners.map((corner) => {
    const rect = { ...corner, ...card };
    const distance = Math.hypot(
      corner.left + card.width / 2 - targetCenter.x,
      corner.top + card.height / 2 - targetCenter.y,
    );

    return { corner, overlap: overlapArea(rect, target), distance };
  });

  scored.sort((a, b) => a.overlap - b.overlap || b.distance - a.distance);

  const best = scored[0];

  return {
    ...best.corner,
    placement: "docked",
    overlapsTarget: best.overlap > 0,
    compact: true,
    maxHeight,
  };
}

/** The first candidate side where a card of this size fits without covering the target. */
function firstCleanSide(
  target: Rect,
  card: Size,
  viewport: Size,
  preferred: CardSide | undefined,
  gap: number,
  margin: number,
): { side: CardSide; top: number; left: number } | null {
  for (const side of candidateSides(preferred)) {
    const position = positionOn(side, target, card, viewport, gap, margin);

    if (!fitsViewport(position, card, viewport, margin)) continue;
    if (overlapArea({ ...position, ...card }, target) > 0) continue;

    return { side, ...position };
  }

  return null;
}

function computeCardPlacement({
  target,
  card,
  viewport,
  preferred,
  gap = DEFAULT_GAP,
  margin = DEFAULT_MARGIN,
  maxHeight = Number.POSITIVE_INFINITY,
  compactMaxHeight,
}: PlacementInput): PlacementResult {
  const compactLimit = Math.min(compactMaxHeight ?? maxHeight, maxHeight);
  const full = { width: card.width, height: Math.min(card.height, maxHeight) };
  const compact = {
    width: card.width,
    height: Math.min(card.height, compactLimit),
  };

  if (!target || preferred === "center")
    return centered(full, viewport, margin, maxHeight);

  const side = preferred as CardSide | undefined;
  const fullFit = firstCleanSide(target, full, viewport, side, gap, margin);

  if (fullFit) {
    return {
      top: fullFit.top,
      left: fullFit.left,
      placement: fullFit.side,
      overlapsTarget: false,
      compact: false,
      maxHeight,
    };
  }

  const compactFit = firstCleanSide(
    target,
    compact,
    viewport,
    side,
    gap,
    margin,
  );

  if (compactFit) {
    return {
      top: compactFit.top,
      left: compactFit.left,
      placement: compactFit.side,
      overlapsTarget: false,
      compact: true,
      maxHeight: compactLimit,
    };
  }

  return docked(target, compact, viewport, margin, compactLimit);
}

/**
 * The card's natural height from what the DOM reports: its box minus the
 * visible part of the scrolling body plus that body's full content. It does
 * not change with the card's max-height, which is the point.
 */
function naturalCardHeight(
  boxHeight: number,
  bodyClientHeight: number,
  bodyScrollHeight: number,
): number {
  return (
    boxHeight - bodyClientHeight + Math.max(bodyClientHeight, bodyScrollHeight)
  );
}

/** Card max-heights as fractions of the layout viewport (the CSS `vh`). */
const CARD_MAX_HEIGHT_RATIO = 0.7;
const CARD_COMPACT_MAX_HEIGHT_RATIO = 0.45;

type SheetSide = "top" | "bottom";

/** The phone sheet's CSS clamp (`max-h-[45dvh]`) as a fraction of the viewport. */
const SHEET_MAX_HEIGHT_RATIO = 0.45;

/**
 * The phone variant: the card is a sheet on the bottom edge, unless the
 * target sits where the sheet would be and there is room for it on top.
 * The side is judged with the height the sheet is drawn at — its natural
 * height clamped by `maxSheetHeight` — not the unclamped content height,
 * which a long step's sheet never actually has.
 */
function computeSheetSide(
  target: Rect | null,
  viewportHeight: number,
  naturalHeight: number,
  maxSheetHeight = Number.POSITIVE_INFINITY,
  gap = 8,
): SheetSide {
  if (!target) return "bottom";

  const sheetHeight = Math.min(naturalHeight, maxSheetHeight);
  const sheetTop = viewportHeight - sheetHeight;

  if (target.top + target.height <= sheetTop - gap) return "bottom";
  if (target.top >= sheetHeight + gap) return "top";

  // Neither side is clean (a tall target): keep the bottom, where the thumb is.
  return "bottom";
}

export {
  SHEET_MAX_HEIGHT_RATIO,
  CARD_COMPACT_MAX_HEIGHT_RATIO,
  CARD_MAX_HEIGHT_RATIO,
  candidateSides,
  computeCardPlacement,
  computeSheetSide,
  naturalCardHeight,
  overlapArea,
};
export type {
  CardSide,
  PreferredPlacement,
  PlacementInput,
  PlacementResult,
  Rect,
  Size,
  SheetSide,
};
