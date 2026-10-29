import { mobileTutorialAnchor } from "@/components/ui/segmented-nav";

import type {
  TutorialStep,
  TutorialStepVariant,
} from "../tutorial-provider/tutorial-provider.types";

/**
 * Anchors are `data-tutorial` values and nothing else (decision 9.1).
 *
 * The regression of 15ce80b is why: 40 steps pointed at `[role=table]` and
 * `th:last-child`, an accessibility fix removed the role, and 21 tours lost
 * their table without a single failing test. An attribute that exists only
 * for the tour cannot be removed by somebody fixing something else.
 */
const ANCHOR_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isValidAnchor(anchor: string): boolean {
  return ANCHOR_PATTERN.test(anchor);
}

function anchorSelector(anchor: string): string {
  return `[data-tutorial="${anchor}"]`;
}

/** Rendered, laid out and not hidden by CSS — what a person can actually see. */
function isElementVisible(element: Element): boolean {
  if (!element.isConnected) return false;

  const view = element.ownerDocument.defaultView;
  const style = view?.getComputedStyle(element);

  if (
    style &&
    (style.display === "none" ||
      style.visibility === "hidden" ||
      style.visibility === "collapse")
  ) {
    return false;
  }

  // Covers ancestors with display:none (an inactive tab panel, `hidden md:flex`).
  const checkVisibility = (
    element as Element & {
      checkVisibility?: (options?: Record<string, boolean>) => boolean;
    }
  ).checkVisibility;

  if (
    typeof checkVisibility === "function" &&
    !checkVisibility.call(element, { visibilityProperty: true })
  ) {
    return false;
  }

  const rect = element.getBoundingClientRect();

  return rect.width > 0 && rect.height > 0;
}

/**
 * The first VISIBLE element with this anchor. The first match in document
 * order is often the hidden twin (the phone menu of the desk strip, a
 * collapsed panel), which is what made steps measure a 0x0 box.
 */
function findVisibleAnchor(
  anchor: string,
  root: ParentNode = document,
): HTMLElement | null {
  const matches = root.querySelectorAll<HTMLElement>(anchorSelector(anchor));

  for (const element of Array.from(matches)) {
    if (isElementVisible(element)) return element;
  }

  return null;
}

/** Anchors a step may land on, in the order they are tried. */
function stepCandidates(step: TutorialStep): TutorialStepVariant[] {
  const primary: TutorialStepVariant[] = step.anchor
    ? [{ anchor: step.anchor, title: step.title, content: step.content }]
    : [];

  const all = [...primary, ...(step.variants ?? [])];

  // The segmented strips draw a separate menu on phones, anchored as
  // `<anchor>-mobile` (SegmentedNav's contract); it stands in for the desk one.
  return all.flatMap((candidate) => {
    const mobile = mobileTutorialAnchor(candidate.anchor);

    return mobile ? [candidate, { ...candidate, anchor: mobile }] : [candidate];
  });
}

interface ResolvedTarget {
  element: HTMLElement;
  anchor: string;
  title: string;
  content: string;
}

function resolveStepTarget(
  step: TutorialStep,
  root: ParentNode = document,
): ResolvedTarget | null {
  for (const candidate of stepCandidates(step)) {
    const element = findVisibleAnchor(candidate.anchor, root);

    if (element) {
      return {
        element,
        anchor: candidate.anchor,
        title: candidate.title ?? step.title,
        content: candidate.content ?? step.content,
      };
    }
  }

  return null;
}

/** Every anchor a step names (variants included), for the static checks. */
function stepAnchors(step: TutorialStep): string[] {
  return [
    step.anchor,
    ...(step.variants ?? []).map((variant) => variant.anchor),
  ].filter((anchor): anchor is string => Boolean(anchor));
}

export {
  ANCHOR_PATTERN,
  anchorSelector,
  findVisibleAnchor,
  isElementVisible,
  isValidAnchor,
  resolveStepTarget,
  stepAnchors,
  stepCandidates,
};
export type { ResolvedTarget };
