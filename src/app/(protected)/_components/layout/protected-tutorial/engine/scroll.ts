import type { Rect } from "./placement";

/**
 * Bringing a target on screen and measuring what of it is actually visible.
 *
 * The old engine listened to the window scroll only. Inner scrollers — the
 * DataTable's Radix viewport (vertical AND horizontal: the ⋮ column sits at
 * the far right of wide tables), the segmented strips, the chat — were
 * ignored, so a step could spotlight a cell scrolled out of its container.
 */

const CLIPPING_OVERFLOW = /(auto|scroll|hidden|clip|overlay)/;

/** Ancestors that clip their content, innermost first. */
function clippingAncestors(element: Element): HTMLElement[] {
  const view = element.ownerDocument.defaultView;
  const result: HTMLElement[] = [];

  // A fixed box (the sidebar, a drawer) escapes its ancestors' overflow, so
  // nothing above it clips it.
  if (view?.getComputedStyle(element).position === "fixed") return result;

  let current = element.parentElement;

  while (current && current !== element.ownerDocument.body) {
    const style = view?.getComputedStyle(current);

    if (
      style &&
      CLIPPING_OVERFLOW.test(
        `${style.overflow} ${style.overflowX} ${style.overflowY}`,
      )
    ) {
      result.push(current);
    }

    if (style?.position === "fixed") break;

    current = current.parentElement;
  }

  return result;
}

function intersect(a: Rect, b: Rect): Rect | null {
  const top = Math.max(a.top, b.top);
  const left = Math.max(a.left, b.left);
  const bottom = Math.min(a.top + a.height, b.top + b.height);
  const right = Math.min(a.left + a.width, b.left + b.width);

  if (bottom <= top || right <= left) return null;

  return { top, left, width: right - left, height: bottom - top };
}

function toRect(domRect: DOMRect | Rect): Rect {
  return {
    top: domRect.top,
    left: domRect.left,
    width: domRect.width,
    height: domRect.height,
  };
}

/**
 * The part of `element` a person can see: its box cut by every clipping
 * ancestor and by the viewport. Null when nothing of it is visible.
 */
function visibleRectOf(
  element: Element,
  viewport: { width: number; height: number },
): Rect | null {
  let rect: Rect | null = toRect(element.getBoundingClientRect());

  for (const ancestor of clippingAncestors(element)) {
    if (!rect) return null;

    rect = intersect(rect, toRect(ancestor.getBoundingClientRect()));
  }

  return rect
    ? intersect(rect, {
        top: 0,
        left: 0,
        width: viewport.width,
        height: viewport.height,
      })
    : null;
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/**
 * Scrolls every scrollable ancestor (window included, the Radix viewport
 * included) until the target is centered. A target taller or wider than the
 * viewport is aligned to its start instead, or centering would hide its top.
 */
function revealElement(
  element: HTMLElement,
  viewport: { width: number; height: number },
): void {
  const rect = element.getBoundingClientRect();

  if (typeof element.scrollIntoView !== "function") return;

  element.scrollIntoView({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    block: rect.height > viewport.height * 0.8 ? "start" : "center",
    inline: rect.width > viewport.width * 0.8 ? "nearest" : "center",
  });
}

/**
 * Resolves once the element stops moving (smooth scroll finished, layout
 * settled) or after `timeoutMs`, whichever comes first.
 *
 * The cap only matters while the element still moves. At 700 ms a long
 * smooth scroll (the ⋮ column of a wide table, window and inner viewport
 * at once, on a busy main thread) was cut short: the step resolved with its
 * target still off-screen, the card headed for the center and turned back
 * mid-flight once the target arrived.
 */
function waitForStableRect(element: Element, timeoutMs = 1500): Promise<void> {
  return new Promise((resolve) => {
    const started = performance.now();
    let previous = element.getBoundingClientRect();
    let stableFrames = 0;

    const tick = () => {
      const current = element.getBoundingClientRect();
      const same =
        Math.abs(current.top - previous.top) < 0.5 &&
        Math.abs(current.left - previous.left) < 0.5 &&
        Math.abs(current.width - previous.width) < 0.5 &&
        Math.abs(current.height - previous.height) < 0.5;

      stableFrames = same ? stableFrames + 1 : 0;
      previous = current;

      if (stableFrames >= 3 || performance.now() - started > timeoutMs) {
        resolve();
        return;
      }

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  });
}

export {
  clippingAncestors,
  intersect,
  prefersReducedMotion,
  revealElement,
  visibleRectOf,
  waitForStableRect,
};
