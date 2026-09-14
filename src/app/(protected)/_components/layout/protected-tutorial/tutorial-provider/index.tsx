"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";

import { usePathname } from "next/navigation";
import { tutorialConfigs, TutorialStep, canViewAdvancedFeatures } from "./data";

import type {
  TutorialContextType,
  TutorialProviderProps,
  UserPermissions,
} from "./tutorial-provider.types";

const TutorialContext = createContext<TutorialContextType>(
  {} as TutorialContextType,
);

// LocalStorage utilities
const hasSeenTutorial = (pageKey: string): boolean => {
  if (typeof window !== "undefined") {
    return localStorage.getItem(pageKey) === "true";
  }

  return false;
};

const markAsSeen = (pageKey: string): void => {
  if (typeof window !== "undefined") {
    localStorage.setItem(pageKey, "true");
  }
};

const resetTutorialForPage = (pageKey: string): void => {
  if (typeof window !== "undefined") {
    localStorage.removeItem(pageKey);
  }
};

// Helper function to check if screen is mobile
const isMobileScreen = (): boolean => {
  if (typeof window !== "undefined") {
    return window.innerWidth < 768;
  }

  return false;
};

// First step of EVERY tour: how to navigate it. Centralized so every page's
// tutorial teaches the same controls without repeating it in each config.
const KEYBOARD_INTRO_STEP: TutorialStep = {
  target: "body",
  placement: "center",
  title: "Como navegar no tutorial",
  content:
    "Este tutorial guiado destaca os elementos da tela passo a passo.\n" +
    "• Use as setas ← e → do teclado para avançar e voltar.\n" +
    "• Pressione ESC para sair a qualquer momento.\n" +
    "• Você também pode usar os botões Anterior e Próximo abaixo.\n" +
    "DICA: Reabra este tutorial quando quiser pressionando ? ou pelo botão de ajuda na barra lateral.",
};

/** Global shortcuts must not fire while the user is typing in a field. */
const isEditableTarget = (el: Element | null): boolean => {
  if (!el) return false;

  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    (el as HTMLElement).isContentEditable
  );
};

// Helper function to detect active tab
const getActiveTab = (): string => {
  if (typeof window !== "undefined") {
    // Deliveries keeps three different tables behind one path, so the tab
    // decides which tour applies — the same split the dashboard already does
    // for Análise Gráfica and Limites de Uso.
    const activeDeliveryTab = document.querySelector(
      '[role="tab"][data-state="active"][data-tutorial^="deliveries-tab-"]',
    );

    if (activeDeliveryTab) {
      const attribute = activeDeliveryTab.getAttribute("data-tutorial") ?? "";
      return attribute.replace("deliveries-tab-", "deliveries:");
    }

    // Search for active tabs in the DOM
    const activeTab = document.querySelector(
      '[role="tab"][data-state="active"]',
    );
    if (activeTab) {
      const value = activeTab.getAttribute("data-value");
      if (value) return value;
    }

    // Fallback: Search for active TabsTrigger
    const activeTabsTrigger = document.querySelector(
      '[data-state="active"][data-tutorial*="tab"]',
    );

    if (activeTabsTrigger) {
      const tutorialAttr = activeTabsTrigger.getAttribute("data-tutorial");

      if (tutorialAttr?.includes("overview")) return "overview";
      if (tutorialAttr?.includes("charts")) return "charts";

      if (tutorialAttr?.includes("limits")) return "limits";
    }
  }
  return "overview"; // Default
};

// Function to filter tutorial steps based on user permissions
const filterTutorialSteps = (
  steps: TutorialStep[],
  userPermissions?: UserPermissions,
  currentTab?: string,
): TutorialStep[] => {
  return steps.filter((step) => {
    // Check if step has a condition function
    if (step.condition) {
      return step.condition(userPermissions, currentTab);
    }

    return true;
  });
};

// Function to get available tabs based on role (simplificado)
const getAvailableTabs = (userPermissions?: UserPermissions): string[] => {
  const tabs = ["overview"];

  // Only MASTER and BUSINESS_ADMIN can see advanced features
  if (canViewAdvancedFeatures(userPermissions)) {
    tabs.push("charts");
    tabs.push("limits");
  }

  return tabs;
};

// Function to update dynamic step content based on available tabs
const updateStepContent = (
  step: TutorialStep,
  userPermissions?: UserPermissions,
): TutorialStep => {
  // Update the dashboard tabs explanation step
  if (step.target === "[data-tutorial='dashboard-tabs']") {
    const availableTabs = getAvailableTabs(userPermissions);

    let content = "O dashboard está organizado em abas principais:\n";
    content +=
      "• Overview: Visão geral com cartões, atividades recentes e atalhos rápidos.";

    if (availableTabs.includes("charts")) {
      content +=
        "\n• Análise Gráfica: Gráficos detalhados de tendências e custos.";
    }

    if (availableTabs.includes("limits")) {
      content +=
        "\n• Limites de Uso: Monitoramento do consumo de serviços com IA.";
    }

    return {
      ...step,
      content,
    };
  }

  return step;
};

const TutorialProvider: React.FC<TutorialProviderProps> = ({
  children,
  userPermissions,
}): JSX.Element => {
  const pathname = usePathname();

  const [isActive, setIsActive] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);

  const [steps, setSteps] = useState<TutorialStep[]>([]);
  const [currentTab, setCurrentTab] = useState<string>("overview");

  const shouldShowTutorial = useRef<boolean>(false);

  // Function to get the correct tutorial config based on page and tab
  const getTutorialKey = useCallback((path: string, tab: string) => {
    if (path === "/dashboard" && tab === "charts") {
      return "/dashboard/charts";
    }

    if (path === "/dashboard" && tab === "limits") {
      return "/dashboard/limits";
    }

    // Each deliveries tab has its own tour, and its own "already seen" flag —
    // landing on Embarcadores for the first time should teach Embarcadores.
    if (path === "/dashboard/deliveries" && tab.startsWith("deliveries:")) {
      const deliveryTab = tab.slice("deliveries:".length);

      return deliveryTab === "deliveries"
        ? "/dashboard/deliveries"
        : `/dashboard/deliveries/${deliveryTab}`;
    }

    return path;
  }, []);

  // Function to process tutorial steps with permissions (simplificado)
  const processTutorialSteps = useCallback(
    (tutorialKey: string, tab: string) => {
      const rawSteps = tutorialConfigs[tutorialKey];
      if (!rawSteps) return [];

      // Filter steps based on role
      const filteredSteps = filterTutorialSteps(rawSteps, userPermissions, tab);

      // Update step content dynamically
      const updatedSteps = filteredSteps.map((step) =>
        updateStepContent(step, userPermissions),
      );

      if (updatedSteps.length === 0) return updatedSteps;

      // Every tour opens teaching how to drive it — prepended here, in one
      // place, instead of copy-pasted into every page's config.
      return [KEYBOARD_INTRO_STEP, ...updatedSteps];
    },
    [userPermissions],
  );

  // Check if user has seen tutorial for current page/tab
  useEffect(() => {
    const detectedTab = getActiveTab();
    setCurrentTab(detectedTab);

    const tutorialKey = getTutorialKey(pathname, detectedTab);
    const pageKey = `tutorial_${tutorialKey}`;

    const hasSeen = hasSeenTutorial(pageKey);
    const isMobile = isMobileScreen();

    const processedSteps = processTutorialSteps(tutorialKey, detectedTab);

    shouldShowTutorial.current =
      !hasSeen && !isMobile && processedSteps.length > 0;

    if (shouldShowTutorial.current) {
      setTimeout(() => {
        setSteps(processedSteps);
        setIsActive(true);

        setCurrentStep(0);
      }, 200);
    } else {
      setIsActive(false);
    }
  }, [pathname, getTutorialKey, processTutorialSteps]);

  // Watch for tab changes
  useEffect(() => {
    const handleTabChange = () => {
      const detectedTab = getActiveTab();
      if (detectedTab !== currentTab) {
        setCurrentTab(detectedTab);

        // If tutorial is not active, check if we should show it for the new tab
        if (!isActive) {
          const tutorialKey = getTutorialKey(pathname, detectedTab);
          const pageKey = `tutorial_${tutorialKey}`;

          const hasSeen = hasSeenTutorial(pageKey);
          const isMobile = isMobileScreen();

          const processedSteps = processTutorialSteps(tutorialKey, detectedTab);

          if (!hasSeen && !isMobile && processedSteps.length > 0) {
            setTimeout(() => {
              setSteps(processedSteps);
              setIsActive(true);

              setCurrentStep(0);
            }, 300);
          }
        }
      }
    };

    // Listen for tab changes
    const observer = new MutationObserver(handleTabChange);
    if (typeof window !== "undefined") {
      observer.observe(document.body, {
        attributes: true,
        subtree: true,
        attributeFilter: ["data-state"],
      });
    }

    return () => observer.disconnect();
  }, [pathname, currentTab, isActive, getTutorialKey, processTutorialSteps]);

  // Add resize listener
  useEffect(() => {
    const handleResize = () => {
      const isMobile = isMobileScreen();
      const tutorialKey = getTutorialKey(pathname, currentTab);

      const pageKey = `tutorial_${tutorialKey}`;
      const hasSeen = hasSeenTutorial(pageKey);

      const processedSteps = processTutorialSteps(tutorialKey, currentTab);

      if (!isMobile && !hasSeen && processedSteps.length > 0 && !isActive) {
        setSteps(processedSteps);
        setIsActive(true);

        setCurrentStep(0);
      }

      if (isMobile && isActive) {
        setIsActive(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [pathname, currentTab, isActive, getTutorialKey, processTutorialSteps]);

  const startTutorial = useCallback(() => {
    if (isMobileScreen()) return;

    const tutorialKey = getTutorialKey(pathname, currentTab);
    const processedSteps = processTutorialSteps(tutorialKey, currentTab);

    if (processedSteps.length > 0) {
      setSteps(processedSteps);

      setIsActive(true);
      setCurrentStep(0);
    }
  }, [pathname, currentTab, getTutorialKey, processTutorialSteps]);

  const nextStep = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      if (!isMobileScreen()) {
        const tutorialKey = getTutorialKey(pathname, currentTab);
        const pageKey = `tutorial_${tutorialKey}`;

        markAsSeen(pageKey);
      }

      setIsActive(false);
      setCurrentStep(0);
    }
  }, [currentStep, steps.length, pathname, currentTab, getTutorialKey]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const skipTutorial = useCallback(() => {
    if (!isMobileScreen()) {
      const tutorialKey = getTutorialKey(pathname, currentTab);
      const pageKey = `tutorial_${tutorialKey}`;

      markAsSeen(pageKey);
    }

    setIsActive(false);
    setCurrentStep(0);
  }, [pathname, currentTab, getTutorialKey]);

  const completeTutorial = useCallback(() => {
    if (!isMobileScreen()) {
      const tutorialKey = getTutorialKey(pathname, currentTab);
      const pageKey = `tutorial_${tutorialKey}`;

      markAsSeen(pageKey);
    }

    setIsActive(false);
    setCurrentStep(0);
  }, [pathname, currentTab, getTutorialKey]);

  const resetTutorial = useCallback(() => {
    if (isMobileScreen()) return;

    const tutorialKey = getTutorialKey(pathname, currentTab);
    const pageKey = `tutorial_${tutorialKey}`;

    resetTutorialForPage(pageKey);
    startTutorial();
  }, [pathname, currentTab, startTutorial, getTutorialKey]);

  // Handle ESC key to close tutorial
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isActive) {
        skipTutorial();
      }
    };

    if (isActive) {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isActive, skipTutorial]);

  // Global "?" shortcut (help/tutorial convention): reopens the tour of the
  // current page. Deliberately inert on pages without a tutorial — a shortcut
  // that opens nothing (or the wrong page's tour) reads as broken; the
  // sidebar item already explains "página direta, sem tutorial".
  useEffect(() => {
    const handleShortcut = (e: KeyboardEvent) => {
      if (e.key !== "?" || e.ctrlKey || e.metaKey || e.altKey) return;

      if (isActive) return;
      if (isEditableTarget(document.activeElement)) return;
      if (isMobileScreen()) return;

      const tutorialKey = getTutorialKey(pathname, currentTab);
      if (processTutorialSteps(tutorialKey, currentTab).length === 0) return;

      e.preventDefault();
      resetTutorial();
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [
    isActive,
    pathname,
    currentTab,
    getTutorialKey,
    processTutorialSteps,
    resetTutorial,
  ]);

  return (
    <TutorialContext.Provider
      value={{
        isActive,
        currentStep,
        steps,
        startTutorial,
        nextStep,
        prevStep,
        skipTutorial,
        completeTutorial,
        resetTutorial,
        setCurrentTab,
        currentTab,
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
};

const useTutorial = () => {
  const context = useContext(TutorialContext);

  if (!context) {
    throw new Error("useTutorial must be used within a TutorialProvider");
  }

  return context;
};

export { TutorialProvider, useTutorial };
