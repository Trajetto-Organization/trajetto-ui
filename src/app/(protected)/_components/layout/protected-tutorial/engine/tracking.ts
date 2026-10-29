/**
 * Keeps the tour glued to its target while the page moves under it.
 *
 * The old engine re-measured on window scroll/resize and on a ResizeObserver
 * of the target alone. A target that MOVES without changing size (the tabs of
 * /admin, the "Todas / Não lidas" switch of /notifications while the sidebar
 * collapses) fired none of those, so the card stayed behind; only a target
 * that itself resized ("Menu de Navegação", the sidebar) was followed.
 *
 * Two parts:
 * - `createLayoutTracker`: the scheduler, pure (frames and clock injected).
 *   Discrete changes ask for one measure on the next frame; a layout
 *   transition or animation starts a per-frame loop that stops by itself once
 *   nothing runs and the measured layout has stood still for a few frames.
 * - `observeLayout`: the DOM wiring that feeds it.
 */

interface FrameHost {
  requestFrame(callback: () => void): number;
  cancelFrame(handle: number): void;
  now(): number;
}

interface LayoutTrackerOptions {
  /**
   * Reads the layout, applies it, and returns a signature of what it read.
   * The loop stops once the signature stays the same for `settleFrames`.
   */
  measure: () => string;
  host: FrameHost;
  /** Identical frames in a row, with nothing running, that end the loop. */
  settleFrames?: number;
  /**
   * Safety cap after the last activity: a transition whose end event never
   * comes (its element was removed mid-way) must not keep the loop alive.
   */
  maxLoopMs?: number;
}

interface LayoutTracker {
  /** One measure on the next frame (coalesced). */
  schedule(): void;
  /** Measures now, in this frame (ResizeObserver callbacks, before paint). */
  measureNow(): void;
  /** Starts (or extends) the per-frame loop. */
  pulse(): void;
  /** A layout transition started on `key` (element + property). */
  transitionStarted(key: unknown): void;
  /** That transition ended or was cancelled. */
  transitionEnded(key: unknown): void;
  /** True while the per-frame loop runs. */
  readonly looping: boolean;
  dispose(): void;
}

const DEFAULT_SETTLE_FRAMES = 3;
const DEFAULT_MAX_LOOP_MS = 1500;

function createLayoutTracker({
  measure,
  host,
  settleFrames = DEFAULT_SETTLE_FRAMES,
  maxLoopMs = DEFAULT_MAX_LOOP_MS,
}: LayoutTrackerOptions): LayoutTracker {
  const running = new Set<unknown>();
  let frame: number | null = null;
  let looping = false;
  let disposed = false;
  let lastSignature: string | null = null;
  let stableFrames = 0;
  let lastActivity = 0;

  const run = () => {
    lastSignature = measure();
  };

  const tick = () => {
    frame = null;

    if (disposed) return;

    const signature = measure();

    if (!looping) {
      lastSignature = signature;
      return;
    }

    stableFrames = signature === lastSignature ? stableFrames + 1 : 0;
    lastSignature = signature;

    const settled = running.size === 0 && stableFrames >= settleFrames;
    const expired = host.now() - lastActivity > maxLoopMs;

    if (settled || expired) {
      looping = false;
      if (expired) running.clear();
      return;
    }

    frame = host.requestFrame(tick);
  };

  const ensureFrame = () => {
    if (frame === null && !disposed) frame = host.requestFrame(tick);
  };

  return {
    schedule() {
      ensureFrame();
    },
    measureNow() {
      if (disposed) return;
      run();
    },
    pulse() {
      if (disposed) return;
      lastActivity = host.now();
      stableFrames = 0;
      looping = true;
      ensureFrame();
    },
    transitionStarted(key) {
      running.add(key);
      this.pulse();
    },
    transitionEnded(key) {
      running.delete(key);
      // One more loop window: the final frame of the transition must be read.
      this.pulse();
    },
    get looping() {
      return looping;
    },
    dispose() {
      disposed = true;
      looping = false;
      running.clear();
      if (frame !== null) host.cancelFrame(frame);
      frame = null;
    },
  };
}

/**
 * The element and every ancestor up to the root, plus the root itself. A
 * target moves without resizing when something around it resizes (the main
 * column narrowing as the sidebar opens): one of its ancestors always does.
 */
function layoutAncestors(element: Element): Element[] {
  const chain: Element[] = [];
  let current: Element | null = element;

  while (current) {
    chain.push(current);
    current = current.parentElement;
  }

  return chain;
}

interface ObserveLayoutOptions {
  tracker: LayoutTracker;
  /** What to follow; null for a centered step (viewport changes still count). */
  target: Element | null;
  /** The card: its own size changes re-place it. */
  card: Element | null;
  /** Events coming from inside here are the tour's own (hover on its buttons). */
  ignoreWithin?: Element | null;
  win?: Window;
}

/**
 * Properties whose transition repaints but never moves anything: a hover on a
 * table row or a button fades its colors, and that must not start a
 * per-frame loop of layout reads. Unknown or empty names still count.
 */
const PAINT_ONLY_PROPERTY =
  /(^|-)color$|^background(-image|-position)?$|^opacity$|^visibility$|^(box|text)-shadow$|^outline(-.+)?$|^fill(-opacity)?$|^stroke(-.+)?$|^(backdrop-)?filter$/;

/** Infinite paint-only keyframes (Tailwind's skeleton pulse, spinners). */
const PAINT_ONLY_ANIMATION = /^(pulse|spin|ping)$/;

const movesLayout = (event: Event): boolean => {
  const property = (event as TransitionEvent).propertyName;

  if (
    typeof property === "string" &&
    property &&
    PAINT_ONLY_PROPERTY.test(property)
  )
    return false;

  const name = (event as AnimationEvent).animationName;

  return !(typeof name === "string" && name && PAINT_ONLY_ANIMATION.test(name));
};

/** Wires a tracker to the page. Returns the teardown. */
function observeLayout({
  tracker,
  target,
  card,
  ignoreWithin,
  win = window,
}: ObserveLayoutOptions): () => void {
  const doc = win.document;
  const own = (event: Event) => {
    const node = event.target as Node | null;

    return Boolean(
      ignoreWithin &&
      node &&
      typeof node.nodeType === "number" &&
      ignoreWithin.contains(node),
    );
  };

  const onScroll = () => tracker.schedule();
  const onResize = () => tracker.pulse();

  // One key per element and property: two properties of one element run
  // (and end) separately.
  const transitionKey = (event: Event) =>
    `${(event as TransitionEvent).propertyName}@${identity(event.target as object)}`;

  const onTransitionStart = (event: Event) => {
    if (own(event) || !event.target || !movesLayout(event)) return;
    tracker.transitionStarted(transitionKey(event));
  };

  const onTransitionEnd = (event: Event) => {
    if (own(event) || !event.target || !movesLayout(event)) return;
    tracker.transitionEnded(transitionKey(event));
  };

  const onAnimation = (event: Event) => {
    if (own(event) || !movesLayout(event)) return;
    tracker.pulse();
  };

  win.addEventListener("scroll", onScroll, true);
  win.addEventListener("resize", onResize);
  win.visualViewport?.addEventListener("resize", onResize);
  win.visualViewport?.addEventListener("scroll", onScroll);
  doc.addEventListener("transitionrun", onTransitionStart, true);
  doc.addEventListener("transitionend", onTransitionEnd, true);
  doc.addEventListener("transitioncancel", onTransitionEnd, true);
  doc.addEventListener("animationstart", onAnimation, true);
  doc.addEventListener("animationend", onAnimation, true);

  // ResizeObserver callbacks run after layout and before paint: measuring
  // right there puts the card in place in the same frame.
  const ResizeObserverCtor = (
    win as Window & { ResizeObserver?: typeof ResizeObserver }
  ).ResizeObserver;
  let primed = false;
  const observer = ResizeObserverCtor
    ? new ResizeObserverCtor(() => {
        // The first callback reports the initial sizes of everything observed.
        if (!primed) {
          primed = true;
          return;
        }

        tracker.measureNow();
      })
    : null;

  if (observer) {
    for (const element of target
      ? layoutAncestors(target)
      : [doc.documentElement]) {
      observer.observe(element);
    }

    if (card) observer.observe(card);
  }

  tracker.schedule();

  return () => {
    win.removeEventListener("scroll", onScroll, true);
    win.removeEventListener("resize", onResize);
    win.visualViewport?.removeEventListener("resize", onResize);
    win.visualViewport?.removeEventListener("scroll", onScroll);
    doc.removeEventListener("transitionrun", onTransitionStart, true);
    doc.removeEventListener("transitionend", onTransitionEnd, true);
    doc.removeEventListener("transitioncancel", onTransitionEnd, true);
    doc.removeEventListener("animationstart", onAnimation, true);
    doc.removeEventListener("animationend", onAnimation, true);
    observer?.disconnect();
  };
}

const identities = new WeakMap<object, number>();
let nextIdentity = 1;

/** A stable id per element, so a transition key can be a string. */
function identity(value: object): number {
  let id = identities.get(value);

  if (id === undefined) {
    id = nextIdentity++;
    identities.set(value, id);
  }

  return id;
}

/** The browser's frame host. */
function browserFrameHost(win: Window = window): FrameHost {
  return {
    requestFrame: (callback) => win.requestAnimationFrame(callback),
    cancelFrame: (handle) => win.cancelAnimationFrame(handle),
    now: () => win.performance.now(),
  };
}

export {
  browserFrameHost,
  createLayoutTracker,
  layoutAncestors,
  movesLayout,
  observeLayout,
};
export type { FrameHost, LayoutTracker, LayoutTrackerOptions };
