import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

import { useSidebar } from "@/components/ui/sidebar";

import { useTutorial } from "../../tutorial-provider";
import type { TutorialStep } from "../../tutorial-provider/tutorial-provider.types";
import { resolveStepTarget } from "../../engine/anchors";
import {
  CARD_COMPACT_MAX_HEIGHT_RATIO,
  CARD_MAX_HEIGHT_RATIO,
  computeCardPlacement,
  computeSheetSide,
  naturalCardHeight,
  SHEET_MAX_HEIGHT_RATIO,
  type Rect,
} from "../../engine/placement";
import {
  prefersReducedMotion,
  revealElement,
  visibleRectOf,
  waitForStableRect,
} from "../../engine/scroll";
import {
  isMobileViewport,
  isPageLoading,
  soundsEnabled,
} from "../../engine/policy";
import { createStage, type Stage } from "../../engine/stage";
import {
  browserFrameHost,
  createLayoutTracker,
  observeLayout,
} from "../../engine/tracking";
import {
  cardVisible,
  initialTransitionState,
  motionTimings,
  transitionReducer,
  type TransitionEvent as TourEvent,
  type TransitionState,
} from "../../engine/transition";

import type { ParsedContent } from "../tutorial-component.types";

/** How long a step waits for its anchor to render (streamed content, a drawer opening). */
const TARGET_WAIT_MS = 1500;

/** While loading skeletons are on screen the wait goes on, up to this cap. */
const TARGET_WAIT_WHILE_LOADING_MS = 6000;

/**
 * How long a step waits for its anchor. A step that opens the phone drawer
 * itself waits like a loading page: the drawer mounts its portal and slides
 * in only after this effect asked for it, and on a slow phone (or a busy
 * server) that took longer than 1.5 s, so "Menu de Navegação" fell back to
 * the center with the menu opening right behind it.
 */
function targetWaitMs({ opensDrawer }: { opensDrawer: boolean }): number {
  return opensDrawer ? TARGET_WAIT_WHILE_LOADING_MS : TARGET_WAIT_MS;
}

/**
 * Where the step stands, exposed on the dialog as `data-target-status` so
 * the browser suites can tell a step that found its anchor from one that fell
 * back to the center.
 */
type TargetStatus = "pending" | "found" | "missing" | "centered";

// Smart parser for tutorial content
const parseContent = (content: string): ParsedContent[] => {
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const parsed: ParsedContent[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (
      line.includes("PERMISSÕES NECESSÁRIAS:") ||
      line.includes("PERMISSÕES OBRIGATÓRIAS:") ||
      line.includes("PERMISSÃO NECESSÁRIA:")
    ) {
      parsed.push({ type: "permissions", content: line });
    } else if (line.startsWith("IMPORTANTE:") || line.startsWith("ATENÇÃO:")) {
      parsed.push({
        type: "warning",
        content: line.replace(/^(IMPORTANTE:|ATENÇÃO:)\s*/, ""),
      });
    } else if (line.startsWith("NOTA:") || line.startsWith("DICA:")) {
      parsed.push({
        type: "note",
        content: line.replace(/^(NOTA:|DICA:)\s*/, ""),
      });
    } else if (line.startsWith("•")) {
      const listItems = [line.replace("•", "").trim()];

      while (i + 1 < lines.length && lines[i + 1].startsWith("•")) {
        i++;
        listItems.push(lines[i].replace("•", "").trim());
      }

      parsed.push({ type: "list", content: "", items: listItems });
    } else {
      parsed.push({ type: "text", content: line });
    }
  }

  return parsed;
};

function viewportSize(): { width: number; height: number } {
  const visual = window.visualViewport;

  return {
    width: visual?.width ?? window.innerWidth,
    height: visual?.height ?? window.innerHeight,
  };
}

/**
 * Resolves the step's anchor, waiting for it to render for up to `timeoutMs`
 * — longer (up to `TARGET_WAIT_WHILE_LOADING_MS`) while the page still shows
 * loading skeletons, since the anchor may be behind one.
 */
function waitForTarget(
  find: () => ReturnType<typeof resolveStepTarget>,
  timeoutMs: number,
  signal: { cancelled: boolean },
): Promise<ReturnType<typeof resolveStepTarget>> {
  return new Promise((resolve) => {
    const immediate = find();

    if (immediate) {
      resolve(immediate);
      return;
    }

    const started = performance.now();
    let frame = 0;

    const observer = new MutationObserver(() => {
      const found = find();

      if (found) finish(found);
    });

    const finish = (value: ReturnType<typeof resolveStepTarget>) => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      resolve(value);
    };

    // Attribute changes count too: a drawer opening flips data-state, not the tree.
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    const poll = () => {
      if (signal.cancelled) {
        finish(null);
        return;
      }

      const found = find();

      if (found) {
        finish(found);
        return;
      }

      const elapsed = performance.now() - started;

      if (
        elapsed > timeoutMs &&
        !(isPageLoading() && elapsed < TARGET_WAIT_WHILE_LOADING_MS)
      ) {
        finish(null);
        return;
      }

      frame = requestAnimationFrame(poll);
    };

    frame = requestAnimationFrame(poll);
  });
}

/** What the card shows for one step, frozen when the step resolved. */
interface StepView {
  index: number;
  step: TutorialStep;
  status: Exclude<TargetStatus, "pending">;
  anchor: string;
  title: string;
  content: string;
  element: HTMLElement | null;
}

function useTutorialComponent() {
  const {
    isActive,
    currentStep,
    steps,
    nextStep,
    prevStep,
    dropStep,
    skipTutorial,
  } = useTutorial();
  const { isMobile: sidebarIsMobile, openMobile, setOpenMobile } = useSidebar();

  const stepData = steps[currentStep];

  const [isMobile, setIsMobile] = useState<boolean>(() => isMobileViewport());
  const [transition, dispatch] = useReducer(
    (state: TransitionState<StepView>, event: TourEvent<StepView>) =>
      transitionReducer(state, event),
    undefined,
    () => initialTransitionState<StepView>(),
  );

  const tooltipRef = useRef<HTMLDivElement>(null);
  const holeRef = useRef<SVGRectElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const stageRef = useRef<Stage | null>(null);
  const displayedRef = useRef<StepView | null>(null);
  const requestIdRef = useRef(0);
  // Where the card was drawn just before its copy changed: the FLIP's start.
  const flipFromRef = useRef<Rect | null>(null);
  // The phase/step the last layout pass animated, so a re-render does not replay it.
  const animatedRef = useRef<string>("");
  // True while the old copy is leaving: the card holds still where it was
  // drawn. Tracking the OLD target made the empty card chase it around while
  // the page scrolled to the NEW one, before flipping back.
  const frozenRef = useRef(false);

  // Read once per tour: the motion preference rarely changes mid-tour.
  const timings = useMemo(
    () =>
      motionTimings(
        typeof window !== "undefined" && isActive && prefersReducedMotion(),
      ),
    [isActive],
  );

  // The drawer the tour opened itself, so it closes it again on the way out.
  const openedSidebarRef = useRef(false);

  const nextSoundRef = useRef<HTMLAudioElement | null>(null);
  const backSoundRef = useRef<HTMLAudioElement | null>(null);

  // Sounds only where they help (decision 9.3): never on a phone, never for
  // someone who asked the system for less motion. Off = no Audio at all.
  const playSounds = soundsEnabled(
    isMobile,
    typeof window !== "undefined" && prefersReducedMotion(),
  );

  useEffect(() => {
    if (!isActive || !playSounds) return;

    const next = new Audio("/sounds/next-tutorial.aac");
    const back = new Audio("/sounds/back-tutorial.aac");

    for (const audio of [next, back]) {
      audio.preload = "auto";
      audio.volume = 0.5;
    }

    nextSoundRef.current = next;
    backSoundRef.current = back;

    return () => {
      next.pause();
      back.pause();
      nextSoundRef.current = null;
      backSoundRef.current = null;
    };
  }, [isActive, playSounds]);

  const play = (audioRef: React.RefObject<HTMLAudioElement>) => {
    const audio = audioRef.current;

    if (!audio) return;

    audio.currentTime = 0;
    audio.play().catch(() => undefined);
  };

  const handleNextStep = useCallback(() => {
    play(nextSoundRef);
    nextStep();
  }, [nextStep]);

  // Nothing behind the first step: holding ← must not keep playing "back".
  const handlePrevStep = useCallback(() => {
    if (currentStep === 0) return;

    play(backSoundRef);
    prevStep();
  }, [prevStep, currentStep]);

  // →/← move between steps. Captured before the command palette: the tour is
  // modal, so Ctrl+K is swallowed too.
  useEffect(() => {
    if (!isActive) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        event.stopPropagation();
        handleNextStep();
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        event.stopPropagation();
        handlePrevStep();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener("keydown", onKey, true);

    return () => window.removeEventListener("keydown", onKey, true);
  }, [isActive, handleNextStep, handlePrevStep]);

  // Phone or desk: the card switches between a floating card and a sheet.
  useEffect(() => {
    const update = () => setIsMobile(isMobileViewport());

    update();
    window.addEventListener("resize", update);

    return () => window.removeEventListener("resize", update);
  }, []);

  // One stage per tour: it holds what is drawn (the spotlight morphs from it).
  useLayoutEffect(() => {
    if (!isActive) return;

    const stage = createStage(
      () => ({
        card: tooltipRef.current,
        hole: holeRef.current,
        glow: glowRef.current,
      }),
      timings,
    );

    stageRef.current = stage;

    return () => {
      stage.dispose();
      stageRef.current = null;
    };
  }, [isActive, timings]);

  /**
   * Every event that may swap the copy goes through here: the card's drawn
   * box is taken first, while the old copy is still laid out.
   */
  const dispatchWithSnapshot = useCallback((event: TourEvent<StepView>) => {
    flipFromRef.current = stageRef.current?.cardRect() ?? null;
    dispatch(event);
  }, []);

  /**
   * Measures the shown step's target and places card and spotlight. Reads
   * only: the target's own styles and classes are never touched (the old
   * engine wrote position, z-index and pointer-events on it and then erased
   * its whole style attribute on the way out, taking the page's own inline
   * styles with it). Returns a signature of the layout for the tracker.
   */
  const measure = useCallback((options?: { morph?: boolean }): string => {
    const view = displayedRef.current;
    const cardElement = tooltipRef.current;
    const stage = stageRef.current;

    if (!view || !cardElement || !stage) return "";

    const viewport = viewportSize();
    const body = cardElement.querySelector<HTMLElement>(
      "[data-tutorial-card-body]",
    );
    // Layout sizes, not the drawn box: the card may be mid-animation (scaled).
    // Natural height, not the clamped box: placement picks the clamp, so
    // measuring the clamped box would feed its own answer back into it.
    const cardSize = {
      width: cardElement.offsetWidth,
      height: naturalCardHeight(
        cardElement.offsetHeight,
        body?.clientHeight ?? 0,
        body?.scrollHeight ?? 0,
      ),
    };
    const target =
      view.element && view.element.isConnected ? view.element : null;
    const visible: Rect | null = target
      ? visibleRectOf(target, viewport)
      : null;
    const padding = view.step.spotlightPadding ?? 8;
    const padded = visible
      ? {
          top: visible.top - padding,
          left: visible.left - padding,
          width: visible.width + padding * 2,
          height: visible.height + padding * 2,
        }
      : null;

    const box = padded
      ? `${Math.round(padded.top)},${Math.round(padded.left)},${Math.round(padded.width)},${Math.round(padded.height)}`
      : "-";

    // Leaving: the empty card holds still; only the spotlight stays on the
    // old target (it belongs to that content) until it morphs to the next.
    if (frozenRef.current && !options?.morph) {
      stage.setSpotlight(padded);
      return `frozen|${box}`;
    }

    let where: string;

    if (isMobileViewport(viewport.width)) {
      // The sheet is clamped by CSS (45dvh): judge the side with that height.
      const side = computeSheetSide(
        padded,
        viewport.height,
        cardSize.height,
        window.innerHeight * SHEET_MAX_HEIGHT_RATIO,
      );

      stage.placeSheet(side);
      where = side;
    } else {
      const placement = computeCardPlacement({
        target: padded,
        card: cardSize,
        viewport,
        preferred: target ? view.step.placement : "center",
        // `vh` in CSS is the layout viewport, not the visual one.
        maxHeight: window.innerHeight * CARD_MAX_HEIGHT_RATIO,
        compactMaxHeight: window.innerHeight * CARD_COMPACT_MAX_HEIGHT_RATIO,
      });

      // Tracking glides a change of side; a step change has its own flip.
      stage.placeCard(placement, { glide: !options?.morph });
      where = `${placement.placement}:${Math.round(placement.top)},${Math.round(placement.left)}`;
    }

    stage.setSpotlight(padded, { morph: options?.morph });

    return `${box}|${where}|${cardSize.width}x${cardSize.height}|${viewport.width}x${viewport.height}`;
  }, []);

  // Each step (or a step replaced in place by dropStep) is a new request.
  // Resolving it: open the drawer if the step explains it, wait for the
  // anchor, scroll it into view (inner scrollers included). The card keeps
  // the previous step on screen, faded out, until this is done.
  useLayoutEffect(() => {
    if (!isActive || !stepData) return;

    const signal = { cancelled: false };
    const id = (requestIdRef.current += 1);
    const index = currentStep;

    // Frozen before anything can scroll toward the next target.
    if (displayedRef.current) frozenRef.current = true;
    dispatch({ type: "REQUEST", id });

    const wantsSidebar =
      Boolean(stepData.mobile?.openSidebar) && sidebarIsMobile;

    if (wantsSidebar && !openMobile) {
      openedSidebarRef.current = true;
      setOpenMobile(true);
    } else if (!wantsSidebar && openedSidebarRef.current) {
      openedSidebarRef.current = false;
      setOpenMobile(false);
    }

    const resolve = (view: Omit<StepView, "index" | "step">) =>
      dispatchWithSnapshot({
        type: "RESOLVED",
        id,
        payload: { ...view, index, step: stepData },
      });

    const centered = (status: "centered" | "missing") =>
      resolve({
        status,
        anchor: "",
        title: stepData.title,
        content: stepData.content,
        element: null,
      });

    const run = async () => {
      if (!stepData.anchor && !stepData.variants?.length) {
        centered("centered");
        return;
      }

      const found = await waitForTarget(
        () => resolveStepTarget(stepData),
        targetWaitMs({ opensDrawer: wantsSidebar }),
        signal,
      );

      if (signal.cancelled) return;

      if (!found) {
        // Not on this page for this session (or never rendered): leave the tour.
        if (stepData.optional) {
          dropStep(currentStep);
          return;
        }

        // Explained without pointing (the alert balloon only exists while an
        // alert is pending) — an intended centered step, not a broken one.
        if (stepData.centerWhenMissing) {
          centered("centered");
          return;
        }

        if (process.env.NODE_ENV !== "production") {
          console.warn(
            `[tutorial] âncora não encontrada: ${stepData.anchor ?? "(variantes)"} — passo exibido no centro.`,
          );
        }

        centered("missing");
        return;
      }

      // Scrolled into view before the card reveals at its final spot.
      revealElement(found.element, viewportSize());
      await waitForStableRect(found.element);

      if (signal.cancelled) return;

      resolve({
        status: "found",
        anchor: found.anchor,
        title: found.title,
        content: found.content,
        element: found.element,
      });
    };

    void run();

    return () => {
      signal.cancelled = true;
    };
    // `openMobile` is read, not tracked: the step decides the drawer, not the reverse.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isActive,
    currentStep,
    stepData,
    sidebarIsMobile,
    setOpenMobile,
    dropStep,
    dispatchWithSnapshot,
  ]);

  // Closing the tour resets the card and closes the drawer it opened.
  useLayoutEffect(() => {
    if (isActive) return;

    dispatch({ type: "CLOSE" });
    displayedRef.current = null;
    frozenRef.current = false;
    animatedRef.current = "";

    if (openedSidebarRef.current) {
      openedSidebarRef.current = false;
      setOpenMobile(false);
    }
  }, [isActive, setOpenMobile]);

  // The old copy fades out; the swap waits for it (and for the next target).
  // Its end is the fade's own transitionend, not a timer guessing it: a busy
  // main thread starts the fade late, and a timer would swap the copy while
  // the old one is still half visible.
  useEffect(() => {
    if (transition.phase !== "leaving" || transition.contentHidden) return;

    const content = contentRef.current;
    const hidden = () => dispatchWithSnapshot({ type: "CONTENT_HIDDEN" });

    if (
      !content ||
      timings.contentOutMs <= 0 ||
      window.getComputedStyle(content).opacity === "0"
    ) {
      hidden();
      return;
    }

    const onEnd = (event: TransitionEvent) => {
      if (event.target === content && event.propertyName === "opacity")
        hidden();
    };
    // Safety net: a transition that never runs (display:none, a hidden tab).
    const timer = setTimeout(hidden, timings.contentOutMs + 250);

    content.addEventListener("transitionend", onEnd);
    content.addEventListener("transitioncancel", onEnd);

    return () => {
      clearTimeout(timer);
      content.removeEventListener("transitionend", onEnd);
      content.removeEventListener("transitioncancel", onEnd);
    };
  }, [
    transition.phase,
    transition.contentHidden,
    timings,
    dispatchWithSnapshot,
  ]);

  // The new copy is in the DOM (still hidden): place the card for it and
  // animate from where it was drawn — all before the browser paints.
  useLayoutEffect(() => {
    const { phase, displayed } = transition;

    displayedRef.current = displayed?.payload ?? null;
    frozenRef.current = phase === "leaving";

    if (!displayed || (phase !== "entering" && phase !== "moving")) return;

    const key = `${phase}:${displayed.id}`;

    if (animatedRef.current === key) return;

    animatedRef.current = key;

    const stage = stageRef.current;

    measure({ morph: true });

    if (!stage) return;

    if (phase === "entering") {
      stage.enterCard(() => dispatch({ type: "ENTER_DONE", id: displayed.id }));
    } else {
      stage.flipCardFrom(flipFromRef.current, () =>
        dispatch({ type: "MOVE_DONE", id: displayed.id }),
      );
    }
  }, [transition, measure]);

  // Keeps spotlight and card glued to the shown target while the page moves:
  // see engine/tracking (scrolls, resizes, layout transitions anywhere on the
  // page, size changes of the target, of its ancestors and of the card).
  const shownElement = transition.displayed?.payload.element ?? null;
  const shown = cardVisible(transition);

  useLayoutEffect(() => {
    if (!isActive || !shown) return;

    const tracker = createLayoutTracker({
      measure: () => measure(),
      host: browserFrameHost(),
    });
    const card = tooltipRef.current;
    const stop = observeLayout({
      tracker,
      target: shownElement,
      card,
      ignoreWithin: card?.closest("[data-tutorial-overlay]") ?? card,
    });

    return () => {
      stop();
      tracker.dispose();
    };
  }, [isActive, shown, shownElement, measure]);

  /**
   * The tour covers the screen, so Tab has to stay inside it. Escape is
   * handled by the provider.
   */
  useEffect(() => {
    if (!isActive) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;

      const card = tooltipRef.current;

      if (!card) return;

      const focusable = Array.from(
        card.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled]), input:not([disabled]), " +
            "select:not([disabled]), textarea:not([disabled]), " +
            '[tabindex]:not([tabindex="-1"])',
        ),
      );

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (!active || !card.contains(active)) {
        event.preventDefault();
        first.focus();
        return;
      }

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isActive]);

  /**
   * Focus enters the card on open and goes back where it was on close. Keyed
   * on `isActive` alone: moving between steps must not yank focus.
   */
  useEffect(() => {
    if (!isActive) return;

    const restoreTo = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() =>
      tooltipRef.current?.focus({ preventScroll: true }),
    );

    return () => {
      cancelAnimationFrame(frame);

      if (restoreTo && restoreTo !== document.body && restoreTo.isConnected) {
        restoreTo.focus({ preventScroll: true });
        return;
      }

      // The tour usually opens by itself, so there is nothing to go back to;
      // the main region is where the content it described is.
      const main = document.querySelector("main");

      if (main instanceof HTMLElement) {
        main.setAttribute("tabindex", "-1");
        main.focus({ preventScroll: true });
      }
    };
  }, [isActive]);

  if (!isActive || !stepData) return null;

  const view = transition.displayed?.payload ?? null;
  const settled =
    transition.phase === "shown" || transition.phase === "entering";

  return {
    // "pending" until the card stands on the requested step: the browser
    // suites wait on it before reading the step.
    status: (settled && view ? view.status : "pending") as TargetStatus,
    phase: transition.phase,
    visible: cardVisible(transition),
    // The copy fades out the moment a step is left, and back in only once
    // the card stands at the new step. Without motion there is no fade: the
    // old copy stays until the new one replaces it, already in place.
    contentHidden: !settled && timings.contentOutMs > 0,
    timings,
    anchor: view?.anchor ?? "",
    title: view?.title ?? stepData.title,
    parsedContent: parseContent(view?.content ?? stepData.content),
    // The counter and the dots follow the copy on screen, not the request.
    shownStep: view?.index ?? currentStep,
    isMobile,
    tooltipRef,
    holeRef,
    glowRef,
    contentRef,
    steps,
    currentStep,
    skipTutorial,
    handlePrevStep,
    handleNextStep,
  };
}

export { useTutorialComponent, parseContent, targetWaitMs };
export type { TargetStatus };
