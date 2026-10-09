import type { TutorialStep } from "../tutorial-provider/tutorial-provider.types";

import { resolveStepTarget } from "./anchors";

/** Same breakpoint as the sidebar drawer and the segmented strips. */
const MOBILE_BREAKPOINT = 768;

function isMobileViewport(width?: number): boolean {
  if (typeof width === "number") return width < MOBILE_BREAKPOINT;
  if (typeof window === "undefined") return false;

  return window.innerWidth < MOBILE_BREAKPOINT;
}

/**
 * Whether a tour opens by itself the first time (decisions 9.2 and 9.3):
 * the back office is on demand, and on a phone only the global tour of
 * /dashboard opens unasked — a sheet over every new screen is noise there.
 */
function shouldAutoStart(tourKey: string, isMobile: boolean): boolean {
  if (tourKey === "" || tourKey.startsWith("/admin")) return false;
  if (isMobile) return tourKey === "/dashboard";

  return true;
}

/** Off on phones and for anyone who asked the system for less motion (decision 9.3). */
function soundsEnabled(isMobile: boolean, reducedMotion: boolean): boolean {
  return !isMobile && !reducedMotion;
}

/**
 * Marker on the page-level loading skeletons (Suspense fallbacks and
 * loading.tsx). While one is on screen the page is still streaming, so
 * "anchor not rendered" says nothing yet about whether the page has that
 * element. `aria-busy="true"` counts too: some loaders already declare it.
 * Not the shared `Skeleton`: it also lives inside settled UI (the sidebar,
 * selectors), which would hold every tour back.
 */
const LOADING_ANCHOR = "loading";

function isPageLoading(root: ParentNode = document): boolean {
  return (
    root.querySelector(
      `[data-tutorial="${LOADING_ANCHOR}"], [aria-busy="true"]`,
    ) !== null
  );
}

interface SelectStepsOptions {
  /** The session's verdict for a path — `canAccessPath`, never a copy of it. */
  canOpen: (path: string) => boolean;
  root?: ParentNode;
  /** Phone layout: steps that open the drawer are judged when they are reached. */
  isMobile?: boolean;
  /**
   * The page is still loading: keep every optional step and let the walk
   * decide each one when it gets there (the engine drops it then if its
   * anchor never shows up).
   */
  deferOptional?: boolean;
}

/**
 * The steps this session gets when the tour starts: steps tied to a page the
 * session cannot open are dropped, and optional steps whose anchors are not
 * rendered are dropped — unless that verdict cannot be given yet (the page
 * is streaming, or the anchor lives in the closed phone drawer), in which
 * case the step stays and is decided when the walk reaches it. The page is
 * the source of truth for what is on it; the tour does not reimplement its
 * permission rules.
 */
function selectTourSteps(
  steps: readonly TutorialStep[],
  {
    canOpen,
    root,
    isMobile = false,
    deferOptional = false,
  }: SelectStepsOptions,
): TutorialStep[] {
  return steps.filter((step) => {
    if (step.requiresPath && !canOpen(step.requiresPath)) return false;
    if (!step.optional) return true;
    if (deferOptional) return true;
    if (isMobile && step.mobile?.openSidebar) return true;

    return resolveStepTarget(step, root) !== null;
  });
}

export {
  LOADING_ANCHOR,
  MOBILE_BREAKPOINT,
  isPageLoading,
  isMobileViewport,
  selectTourSteps,
  shouldAutoStart,
  soundsEnabled,
};
