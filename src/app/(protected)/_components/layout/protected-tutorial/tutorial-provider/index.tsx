"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { usePathname, useSearchParams } from "next/navigation";

import {
  canAccessPath,
  readablePermissionKeys,
  type RouteAccessContext,
} from "@/lib/route-access";
import { accessibleDeliveryTabs } from "@/features/deliveries/lib/tabs";
import { accessibleTowerViews } from "@/features/control-tower/lib/views";
import { useAuthStore } from "@/store/auth-store";

import { resolveTutorialKey } from "../engine/tutorial-key";
import { hasSeenTour, markTourSeen } from "../engine/seen-storage";
import {
  isMobileViewport,
  isPageLoading,
  selectTourSteps,
  shouldAutoStart,
} from "../engine/policy";

import type {
  TutorialConfig,
  TutorialContextType,
  TutorialProviderProps,
  TutorialStep,
} from "./tutorial-provider.types";

const TutorialContext = createContext<TutorialContextType | null>(null);

/** Time for the page to paint before the first measurement. */
const AUTO_START_DELAY_MS = 600;

/**
 * After that delay the auto-start also waits for the loading skeletons to go
 * away (streamed server data), polling at this pace and giving up at the
 * cap — the walk still decides optional steps lazily if it opens early.
 */
const SETTLE_POLL_MS = 100;
const SETTLE_MAX_MS = 6000;

/** Longest the tours' copy waits for an idle main thread before loading. */
const IDLE_LOAD_TIMEOUT_MS = 2000;

let tourCopyRequest: Promise<TutorialConfig> | null = null;

/** The tours' copy, one request per page load (a failure is asked again). */
const loadTourCopy = (): Promise<TutorialConfig> => {
  tourCopyRequest ??= import("./data")
    .then((module) => module.tutorialConfigs)
    .catch((error: unknown) => {
      tourCopyRequest = null;
      throw error;
    });

  return tourCopyRequest;
};

// First step of every tour: how to drive it. Centralized so each page's
// tour teaches the same controls without repeating them in its config.
const KEYBOARD_INTRO_STEP: TutorialStep = {
  placement: "center",
  title: "Como navegar no tutorial",
  content:
    "Este tutorial guiado destaca os elementos da tela passo a passo.\n" +
    "• Use as setas ← e → do teclado para avançar e voltar.\n" +
    "• Pressione ESC para sair a qualquer momento.\n" +
    "• Você também pode usar os botões Anterior e Próximo abaixo.\n" +
    "DICA: Reabra este tutorial quando quiser pressionando ? ou pelo botão Ver Tutorial na barra lateral.",
};

const TOUCH_INTRO_STEP: TutorialStep = {
  placement: "center",
  title: "Como navegar no tutorial",
  content:
    "Este tutorial guiado destaca os elementos da tela passo a passo.\n" +
    "• Toque em Próximo e Anterior para avançar e voltar.\n" +
    "• Toque no X ou arraste o painel para baixo para sair.\n" +
    "DICA: Reabra este tutorial quando quiser pelo botão Ver Tutorial no menu lateral.",
};

/** Global shortcuts must not fire while the user is typing in a field. */
const isEditableTarget = (element: Element | null): boolean => {
  if (!element) return false;

  const tag = element.tagName;

  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    (element as HTMLElement).isContentEditable
  );
};

interface ActiveTour {
  key: string;
  steps: TutorialStep[];
}

const TutorialProvider = ({
  children,
  user,
}: TutorialProviderProps): JSX.Element => {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const urlTab = searchParams?.get("tab") ?? null;
  const urlView = searchParams?.get("view") ?? null;

  const [tour, setTour] = useState<ActiveTour | null>(null);

  // The tours' copy (~100 KB of text) is its own chunk, fetched once the page
  // is up instead of shipping with every protected page. A failed load is
  // retried on the next screen; meanwhile no tour opens.
  const [tutorialConfigs, setTutorialConfigs] = useState<TutorialConfig | null>(
    null,
  );
  const toursReady = tutorialConfigs !== null;
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [currentTab, setCurrentTab] = useState<string>("overview");

  // The dashboard's tab is per visit: another page starts on "overview".
  useEffect(() => {
    setCurrentTab("overview");
  }, [pathname]);

  // The live session first (the socket refreshes the store when a profile or
  // a module changes), the server snapshot only until the store is filled —
  // the same precedence as the sidebar and the dashboard cards.
  const storePermissions = useAuthStore((state) => state.permissions);
  const storeModules = useAuthStore((state) => state.enabledModules);
  const storeUserId = useAuthStore((state) => state.id);

  const role = user?.role;
  const isDriver = user?.isDriver;
  const permissionRows =
    storePermissions.length > 0 ? storePermissions : user?.permissions;
  const enabledModules = storeModules ?? user?.enabledModules ?? null;

  // Keyed by value, not by identity: the layout rebuilds `user` on every
  // render, and a new context each time would restart the auto-start timer.
  const permissionsSignature = readablePermissionKeys(permissionRows).join(",");
  const modulesSignature =
    enabledModules === null ? "?" : enabledModules.join(",");

  const accessContext = useMemo<RouteAccessContext | null>(() => {
    if (!role) return null;

    return {
      role,
      permissions: permissionsSignature
        ? (permissionsSignature.split(",") as RouteAccessContext["permissions"])
        : [],
      enabledModules:
        modulesSignature === "?"
          ? null
          : modulesSignature
            ? modulesSignature.split(",")
            : [],
      isDriver,
    };
  }, [role, isDriver, permissionsSignature, modulesSignature]);

  const canOpen = useCallback(
    (path: string): boolean =>
      accessContext ? canAccessPath(path, accessContext) : true,
    [accessContext],
  );

  const tourKey = useMemo(
    () =>
      resolveTutorialKey({
        pathname,
        urlTab,
        dashboardTab: currentTab,
        allowedDeliveryTabs: accessContext
          ? accessibleDeliveryTabs(accessContext)
          : undefined,
        urlView,
        allowedTowerViews: accessContext
          ? accessibleTowerViews(accessContext)
          : undefined,
      }),
    [pathname, urlTab, urlView, currentTab, accessContext],
  );

  useEffect(() => {
    if (toursReady) return;

    let active = true;

    // After hydration and the page's own work, when the main thread is idle.
    const load = () => {
      loadTourCopy()
        .then((configs) => {
          if (active) setTutorialConfigs(configs);
        })
        .catch(() => undefined);
    };

    const idle = typeof window.requestIdleCallback === "function";
    const handle = idle
      ? window.requestIdleCallback(load, { timeout: IDLE_LOAD_TIMEOUT_MS })
      : window.setTimeout(load, 0);

    return () => {
      active = false;

      if (idle) window.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
    };
  }, [toursReady, pathname]);

  const hasTour = Boolean(tutorialConfigs?.[tourKey]) && canOpen(pathname);

  // A tour asked for ("?" or Ver Tutorial) before the copy arrived: fetch it
  // now and open the tour as soon as it lands, instead of ignoring the ask.
  const requestedRef = useRef(false);

  const requestBeforeReady = useCallback(() => {
    requestedRef.current = true;

    loadTourCopy()
      .then(setTutorialConfigs)
      .catch(() => {
        requestedRef.current = false;
      });
  }, []);

  const userId = user?.id ?? storeUserId ?? null;

  // Which way the walk last moved, so a dropped step is skipped in that direction.
  const directionRef = useRef<1 | -1>(1);

  const buildSteps = useCallback(
    (key: string): TutorialStep[] => {
      const raw = tutorialConfigs?.[key];

      if (!raw) return [];

      const selected = selectTourSteps(raw, {
        canOpen,
        isMobile: isMobileViewport(),
        deferOptional: isPageLoading(),
      });

      if (selected.length === 0) return [];

      return [
        isMobileViewport() ? TOUCH_INTRO_STEP : KEYBOARD_INTRO_STEP,
        ...selected,
      ];
    },
    [canOpen, tutorialConfigs],
  );

  const open = useCallback(
    (key: string) => {
      const steps = buildSteps(key);

      if (steps.length === 0) return;

      directionRef.current = 1;
      setTour({ key, steps });
      setCurrentStep(0);
    },
    [buildSteps],
  );

  // A tour that belongs to another screen closes when the screen changes.
  const activeKey = tour?.key;

  useEffect(() => {
    if (activeKey && activeKey !== tourKey) setTour(null);
  }, [activeKey, tourKey]);

  // First visit of a screen (per user, v2): open its tour once, unless the
  // policy keeps it on demand. The timer is cleared when the screen changes
  // before it fires, so a tour never opens over the next page.
  const isActive = tour !== null;
  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;

  useEffect(() => {
    if (!hasTour) return;
    if (!shouldAutoStart(tourKey, isMobileViewport())) return;
    if (hasSeenTour(userId, tourKey)) return;

    let timer = 0;
    const deadline = Date.now() + AUTO_START_DELAY_MS + SETTLE_MAX_MS;

    const attempt = () => {
      if (isActiveRef.current) return;

      // Opening over a skeleton would judge the page by its placeholder.
      if (isPageLoading() && Date.now() < deadline) {
        timer = window.setTimeout(attempt, SETTLE_POLL_MS);
        return;
      }

      open(tourKey);
    };

    timer = window.setTimeout(attempt, AUTO_START_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [hasTour, tourKey, userId, open]);

  const close = useCallback(() => {
    if (tour) markTourSeen(userId, tour.key);

    setTour(null);
    setCurrentStep(0);
  }, [tour, userId]);

  const startTutorial = useCallback(() => {
    if (!toursReady) {
      requestBeforeReady();
      return;
    }

    if (!hasTour) return;

    open(tourKey);
  }, [toursReady, requestBeforeReady, hasTour, open, tourKey]);

  useEffect(() => {
    if (!toursReady || !requestedRef.current) return;

    requestedRef.current = false;

    if (hasTour && !isActiveRef.current) open(tourKey);
  }, [toursReady, hasTour, open, tourKey]);

  const stepCount = tour?.steps.length ?? 0;

  const nextStep = useCallback(() => {
    directionRef.current = 1;

    if (currentStep < stepCount - 1) {
      setCurrentStep((step) => step + 1);
      return;
    }

    close();
  }, [close, currentStep, stepCount]);

  const prevStep = useCallback(() => {
    directionRef.current = -1;
    setCurrentStep((step) => (step > 0 ? step - 1 : step));
  }, []);

  /**
   * An optional step whose anchor never rendered leaves the tour when the
   * walk reaches it; the counter shrinks and the walk carries on in the
   * direction it was going. Dropping the last step going forward ends it.
   */
  const dropStep = useCallback(
    (index: number) => {
      if (!tour || index < 0 || index >= tour.steps.length) return;

      const steps = tour.steps.filter((_, position) => position !== index);
      const backwards = directionRef.current === -1;

      if (!backwards && index >= steps.length) {
        close();
        return;
      }

      setTour({ key: tour.key, steps });
      setCurrentStep(backwards ? Math.max(0, index - 1) : index);
    },
    [tour, close],
  );

  // ESC closes the tour (the card's footer promises it).
  useEffect(() => {
    if (!isActive) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isActive, close]);

  // Global "?" (help convention): reopens the tour of the current screen.
  // Inert where there is none — a shortcut that opens the wrong tour reads
  // as broken.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "?" || event.ctrlKey || event.metaKey || event.altKey)
        return;
      if (isActiveRef.current) return;
      if (isEditableTarget(document.activeElement)) return;

      if (!toursReady) {
        event.preventDefault();
        requestBeforeReady();
        return;
      }

      if (!hasTour) return;

      event.preventDefault();
      open(tourKey);
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toursReady, requestBeforeReady, hasTour, open, tourKey]);

  const value = useMemo<TutorialContextType>(
    () => ({
      isActive,
      currentStep,
      steps: tour?.steps ?? [],
      tourKey,
      hasTour,
      toursReady,
      startTutorial,
      nextStep,
      prevStep,
      dropStep,
      skipTutorial: close,
      setCurrentTab,
      currentTab,
    }),
    [
      isActive,
      currentStep,
      tour,
      tourKey,
      hasTour,
      toursReady,
      startTutorial,
      nextStep,
      prevStep,
      dropStep,
      close,
      currentTab,
    ],
  );

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  );
};

/** Outside a provider (the public site, a test) there is simply no tour. */
const INERT_CONTEXT: TutorialContextType = {
  isActive: false,
  currentStep: 0,
  steps: [],
  tourKey: "",
  hasTour: false,
  toursReady: true,
  startTutorial: () => undefined,
  nextStep: () => undefined,
  prevStep: () => undefined,
  dropStep: () => undefined,
  skipTutorial: () => undefined,
  setCurrentTab: () => undefined,
  currentTab: "overview",
};

const useTutorial = (): TutorialContextType =>
  useContext(TutorialContext) ?? INERT_CONTEXT;

export { TutorialProvider, useTutorial };
