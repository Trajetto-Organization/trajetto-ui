import { afterEach, describe, expect, it } from "vitest";

import {
  createLayoutTracker,
  layoutAncestors,
  observeLayout,
  type FrameHost,
} from "@/app/(protected)/_components/layout/protected-tutorial/engine/tracking";
import { waitForStableRect } from "@/app/(protected)/_components/layout/protected-tutorial/engine/scroll";

/**
 * The tracking scheduler (engine/tracking.ts): how the tour keeps its card on
 * a target that moves while a step is open. Frames and clock are driven by
 * hand, so every frame the scheduler asks for is counted.
 */

function fakeHost() {
  let now = 0;
  let nextHandle = 1;
  const queue = new Map<number, () => void>();

  const host: FrameHost = {
    requestFrame(callback) {
      const handle = nextHandle++;

      queue.set(handle, callback);
      return handle;
    },
    cancelFrame(handle) {
      queue.delete(handle);
    },
    now: () => now,
  };

  /** Runs one frame (every callback queued before it), 16 ms later. */
  const frame = () => {
    now += 16;

    const callbacks = [...queue.values()];

    queue.clear();
    callbacks.forEach((callback) => callback());
  };

  return {
    host,
    frame,
    pending: () => queue.size,
    advance: (ms: number) => (now += ms),
  };
}

/** A measure whose layout signature is whatever the test says. */
function signatureSource(initial = "a") {
  let signature = initial;
  let calls = 0;

  return {
    measure: () => {
      calls += 1;
      return signature;
    },
    set: (value: string) => {
      signature = value;
    },
    calls: () => calls,
  };
}

describe("createLayoutTracker", () => {
  it("coalesces discrete changes into one measure on the next frame", () => {
    const { host, frame, pending } = fakeHost();
    const source = signatureSource();
    const tracker = createLayoutTracker({ measure: source.measure, host });

    tracker.schedule();
    tracker.schedule();
    tracker.schedule();

    expect(pending()).toBe(1);

    frame();

    expect(source.calls()).toBe(1);
    expect(pending()).toBe(0);
  });

  it("measures synchronously on measureNow (ResizeObserver callbacks run before paint)", () => {
    const { host, pending } = fakeHost();
    const source = signatureSource();
    const tracker = createLayoutTracker({ measure: source.measure, host });

    tracker.measureNow();

    expect(source.calls()).toBe(1);
    expect(pending()).toBe(0);
  });

  it("keeps measuring every frame while the layout moves and stops once it stands still", () => {
    const { host, frame, pending } = fakeHost();
    const source = signatureSource();
    const tracker = createLayoutTracker({
      measure: source.measure,
      host,
      settleFrames: 3,
    });

    tracker.pulse();

    // The target moves on each of these frames: the loop must keep going.
    for (const position of ["b", "c", "d", "e"]) {
      source.set(position);
      frame();
      expect(tracker.looping).toBe(true);
    }

    // Three identical frames settle it; no frame is left queued.
    frame();
    frame();
    frame();

    expect(tracker.looping).toBe(false);
    expect(pending()).toBe(0);
    expect(source.calls()).toBe(7);
  });

  it("does not stop while a layout transition runs, even on identical frames (a transition's first frames can stand still)", () => {
    const { host, frame } = fakeHost();
    const source = signatureSource();
    const tracker = createLayoutTracker({
      measure: source.measure,
      host,
      settleFrames: 2,
    });

    tracker.transitionStarted("width@sidebar");

    for (let index = 0; index < 10; index += 1) frame();

    expect(tracker.looping).toBe(true);

    tracker.transitionEnded("width@sidebar");
    frame();
    frame();
    frame();

    expect(tracker.looping).toBe(false);
  });

  it("gives up on a transition whose end never arrives after maxLoopMs", () => {
    const { host, frame, pending } = fakeHost();
    const source = signatureSource();
    const tracker = createLayoutTracker({
      measure: source.measure,
      host,
      maxLoopMs: 100,
    });

    tracker.transitionStarted("width@removed-element");

    for (let index = 0; index < 10; index += 1) frame();

    expect(tracker.looping).toBe(false);
    expect(pending()).toBe(0);
  });

  it("queues nothing after dispose", () => {
    const { host, frame, pending } = fakeHost();
    const source = signatureSource();
    const tracker = createLayoutTracker({ measure: source.measure, host });

    tracker.pulse();
    tracker.dispose();

    expect(pending()).toBe(0);

    tracker.schedule();
    tracker.pulse();
    tracker.measureNow();
    frame();

    expect(source.calls()).toBe(0);
  });
});

describe("layoutAncestors", () => {
  it("lists the element and every ancestor up to the root", () => {
    const outer = document.createElement("section");
    const inner = document.createElement("div");
    const target = document.createElement("button");

    inner.appendChild(target);
    outer.appendChild(inner);
    document.body.appendChild(outer);

    const chain = layoutAncestors(target);

    expect(chain.slice(0, 3)).toEqual([target, inner, outer]);
    expect(chain[chain.length - 1]).toBe(document.documentElement);

    outer.remove();
  });
});

describe("observeLayout", () => {
  const cleanups: Array<() => void> = [];

  afterEach(() => {
    cleanups.splice(0).forEach((cleanup) => cleanup());
  });

  function setup() {
    const { host, frame } = fakeHost();
    const source = signatureSource();
    const tracker = createLayoutTracker({
      measure: source.measure,
      host,
      settleFrames: 2,
    });
    const overlay = document.createElement("div");
    const card = document.createElement("div");
    const sidebar = document.createElement("aside");
    const target = document.createElement("button");

    overlay.appendChild(card);
    document.body.append(sidebar, target, overlay);

    const stop = observeLayout({
      tracker,
      target,
      card,
      ignoreWithin: overlay,
    });

    cleanups.push(() => {
      stop();
      tracker.dispose();
      overlay.remove();
      sidebar.remove();
      target.remove();
    });

    // The initial measure.
    frame();

    return { tracker, frame, source, sidebar, card, target };
  }

  it("follows a target moved by a transition on ANOTHER element (the sidebar collapsing)", () => {
    // The owner's repro: the tabs of /admin move sideways while the sidebar
    // animates its width; the tabs themselves never resize.
    const { tracker, frame, source, sidebar } = setup();
    const before = source.calls();

    sidebar.dispatchEvent(new Event("transitionrun", { bubbles: true }));

    expect(tracker.looping).toBe(true);

    for (let index = 0; index < 5; index += 1) frame();

    expect(source.calls() - before).toBe(5);

    sidebar.dispatchEvent(new Event("transitionend", { bubbles: true }));
    frame();
    frame();
    frame();

    expect(tracker.looping).toBe(false);
  });

  it("re-measures on scroll of an inner container (capture) and on window resize", () => {
    const { frame, source, target } = setup();
    const before = source.calls();

    target.dispatchEvent(new Event("scroll"));
    frame();

    expect(source.calls()).toBe(before + 1);

    window.dispatchEvent(new Event("resize"));
    frame();

    expect(source.calls()).toBeGreaterThan(before + 1);
  });

  it("ignores the tour's own transitions (hover on its buttons)", () => {
    const { tracker, card } = setup();

    card.dispatchEvent(new Event("transitionrun", { bubbles: true }));

    expect(tracker.looping).toBe(false);
  });

  it("ignores paint-only transitions and animations (hover colors, skeleton pulse)", () => {
    const { tracker, sidebar } = setup();
    const transition = (type: string, propertyName: string) => {
      const event = new Event(type, { bubbles: true });

      Object.defineProperty(event, "propertyName", { value: propertyName });
      return event;
    };
    const animation = (animationName: string) => {
      const event = new Event("animationstart", { bubbles: true });

      Object.defineProperty(event, "animationName", { value: animationName });
      return event;
    };

    for (const property of [
      "background-color",
      "color",
      "border-color",
      "opacity",
      "box-shadow",
      "outline-color",
    ]) {
      sidebar.dispatchEvent(transition("transitionrun", property));
    }

    sidebar.dispatchEvent(animation("pulse"));

    expect(tracker.looping).toBe(false);

    // A property that moves things still starts the loop.
    sidebar.dispatchEvent(transition("transitionrun", "width"));

    expect(tracker.looping).toBe(true);
  });

  it("stops listening on teardown", () => {
    const { tracker, sidebar } = setup();

    cleanups.splice(0).forEach((cleanup) => cleanup());
    if (!sidebar.isConnected) document.body.appendChild(sidebar);
    sidebar.dispatchEvent(new Event("transitionrun", { bubbles: true }));

    expect(tracker.looping).toBe(false);
    sidebar.remove();
  });
});

describe("waitForStableRect", () => {
  it("keeps waiting for a long smooth scroll instead of resolving with the target still moving at 700 ms", async () => {
    const element = document.createElement("div");
    const started = performance.now();

    let reads = 0;

    // Moves on every read for 1 s (a long reveal scroll), then stands still.
    element.getBoundingClientRect = () => {
      reads += 1;
      const top = performance.now() - started < 1000 ? 900 - reads * 3 : 0;

      return {
        top,
        left: 0,
        width: 10,
        height: 10,
        right: 10,
        bottom: top + 10,
        x: 0,
        y: top,
        toJSON: () => ({}),
      } as DOMRect;
    };

    await waitForStableRect(element);

    expect(performance.now() - started).toBeGreaterThanOrEqual(1000);
  });
});
