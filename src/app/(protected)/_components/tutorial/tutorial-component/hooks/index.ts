import { useEffect, useRef, useState } from "react";
import { useTutorial } from "../../tutorial-provider";

import { useSidebar } from "@/components/ui/sidebar";
import { ParsedContent, SpotlightPosition } from "../dto";

// Smart parser for tutorial content
const parseContent = (content: string): ParsedContent[] => {
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const parsed: ParsedContent[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect important sections
    if (
      line.includes("PERMISSÕES NECESSÁRIAS:") ||
      line.includes("PERMISSÕES OBRIGATÓRIAS:") ||
      line.includes("PERMISSÃO NECESSÁRIA:")
    ) {
      parsed.push({
        type: "permissions",
        content: line,
      });
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
    }
    // Detect lists
    else if (line.startsWith("•")) {
      const listItems = [line.replace("•", "").trim()];

      // Collect all consecutive list items
      while (i + 1 < lines.length && lines[i + 1].startsWith("•")) {
        i++;
        listItems.push(lines[i].replace("•", "").trim());
      }

      parsed.push({
        type: "list",
        content: "",
        items: listItems,
      });
    }
    // Normal text
    else {
      parsed.push({
        type: "text",
        content: line,
      });
    }
  }

  return parsed;
};

function useTutorialComponent() {
  const { isActive, currentStep, steps, nextStep, prevStep, skipTutorial } =
    useTutorial();
  const { state: sidebarState } = useSidebar();

  const [spotlightPosition, setSpotlightPosition] =
    useState<SpotlightPosition | null>(null);

  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  const previousHighlightedElement = useRef<Element | null>(null);
  const [isSmallScreen, setIsSmallScreen] = useState<boolean>(false);

  // Preloading audios
  const nextSoundRef = useRef<HTMLAudioElement | null>(null);
  const backSoundRef = useRef<HTMLAudioElement | null>(null);

  const currentStepData = steps[currentStep];

  // Parse the content
  const parsedContent = currentStepData
    ? parseContent(currentStepData.content)
    : [];

  // Preload audios when component mounts
  useEffect(() => {
    // Create and configure audio for "next"
    const nextAudio = new Audio("/sounds/next-tutorial.aac");
    nextAudio.preload = "auto";

    nextAudio.volume = 0.5;
    nextSoundRef.current = nextAudio;

    // Create and configure audio for "return"
    const backAudio = new Audio("/sounds/back-tutorial.aac");
    backAudio.preload = "auto";

    backAudio.volume = 0.5;
    backSoundRef.current = backAudio;

    // Preload audios silently
    const preloadAudios = async () => {
      try {
        nextAudio.load();
        backAudio.load();
      } catch (error) {
        console.warn("Falha ao pré-carregar áudios do tutorial:", error);
      }
    };

    preloadAudios();

    // Cleanup
    return () => {
      if (nextSoundRef.current) {
        nextSoundRef.current.pause();
        nextSoundRef.current = null;
      }

      if (backSoundRef.current) {
        backSoundRef.current.pause();
        backSoundRef.current = null;
      }
    };
  }, []);

  // Optimized function to play sound
  const playSound = (audioRef: React.RefObject<HTMLAudioElement>) => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((error) => {
        console.warn("Não foi possível reproduzir o som:", error);
      });
    }
  };

  // Handle next step with optimized sound
  const handleNextStep = () => {
    playSound(nextSoundRef);
    nextStep();
  };

  // Handle previous step with optimized sound
  const handlePrevStep = () => {
    playSound(backSoundRef);
    prevStep();
  };

  // Handle screen size changes
  useEffect(() => {
    const checkScreenSize = () => {
      const isMobile = window.innerWidth < 768;
      setIsSmallScreen(isMobile);

      if (isMobile && isActive) {
        skipTutorial();
      }
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);

    return () => {
      window.removeEventListener("resize", checkScreenSize);
    };
  }, [isActive, skipTutorial]);

  // Custom querySelector that supports text search
  const findElement = (selector: string): Element | null => {
    const textMatch = selector.match(/^(.+):has-text\(['"](.+)['"]\)$/);

    if (textMatch) {
      const [, baseSelector, searchText] = textMatch;
      const elements = document.querySelectorAll(baseSelector);

      for (const element of elements) {
        if (element.textContent?.includes(searchText)) {
          return element;
        }
      }
      return null;
    }

    try {
      return document.querySelector(selector);
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    if (!isActive || !currentStepData) return;

    const updatePositions = () => {
      // Clean up previous highlight
      if (previousHighlightedElement.current) {
        previousHighlightedElement.current.classList.remove(
          "tutorial-highlight-enhanced",
        );
        previousHighlightedElement.current.removeAttribute("style");
      }

      const target = findElement(currentStepData.target);

      // Handle center placement (welcome tutorial) - calculate position immediately
      if (currentStepData.placement === "center") {
        setSpotlightPosition(null);

        // Calculate center position with proper dimensions
        if (tooltipRef.current) {
          const tooltipRect = tooltipRef.current.getBoundingClientRect();
          const centerTop = Math.max(
            20,
            Math.min(
              window.innerHeight / 2 - tooltipRect.height / 2,
              window.innerHeight - tooltipRect.height - 20,
            ),
          );
          const centerLeft = Math.max(
            20,
            Math.min(
              window.innerWidth / 2 - tooltipRect.width / 2,
              window.innerWidth - tooltipRect.width - 20,
            ),
          );

          setTooltipPosition({
            top: centerTop,
            left: centerLeft,
          });
        } else {
          // Fallback when tooltip dimensions aren't available yet
          const centerTop = window.innerHeight / 2 - 150;
          const centerLeft = Math.max(20, window.innerWidth / 2 - 200);

          setTooltipPosition({
            top: centerTop,
            left: centerLeft,
          });
        }
        return;
      }

      if (!target) {
        return;
      }

      // Add highlight class and ensure visibility
      target.classList.add("tutorial-highlight-enhanced");

      const targetElement = target as HTMLElement;

      targetElement.style.position = "relative";
      targetElement.style.zIndex = "10001";

      targetElement.style.pointerEvents = "none";

      previousHighlightedElement.current = target;

      const rect = target.getBoundingClientRect();
      const padding = currentStepData.spotlightPadding || 8;

      // Set spotlight position
      setSpotlightPosition({
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      });

      // Calculate tooltip position
      if (tooltipRef.current) {
        const tooltipRect = tooltipRef.current.getBoundingClientRect();

        let top = 0;
        let left = 0;

        switch (currentStepData.placement) {
          case "top":
            top = rect.top - tooltipRect.height - 16;
            left = rect.left + rect.width / 2 - tooltipRect.width / 2;
            break;
          case "bottom":
            top = rect.bottom + 16;
            left = rect.left + rect.width / 2 - tooltipRect.width / 2;
            break;
          case "left":
            top = rect.top + rect.height / 2 - tooltipRect.height / 2;
            left = rect.left - tooltipRect.width - 16;
            break;
          case "right":
            top = rect.top + rect.height / 2 - tooltipRect.height / 2;
            left = rect.right + 16;
            break;
        }

        // Ensure tooltip stays within viewport
        const margin = 16;
        top = Math.max(
          margin,
          Math.min(top, window.innerHeight - tooltipRect.height - margin),
        );
        left = Math.max(
          margin,
          Math.min(left, window.innerWidth - tooltipRect.width - margin),
        );

        setTooltipPosition({ top, left });
      }
    };

    // Initial position calculation
    updatePositions();

    // Only set timer for non-center placements to avoid repositioning issues
    let sidebarUpdateTimer: NodeJS.Timeout | null = null;
    if (currentStepData.placement !== "center") {
      sidebarUpdateTimer = setTimeout(updatePositions, 300);
    }

    // Add resize listener for all placements (including center)
    window.addEventListener("resize", updatePositions);

    // Only add scroll listener for non-center placements
    if (currentStepData.placement !== "center") {
      window.addEventListener("scroll", updatePositions);
    }

    return () => {
      if (previousHighlightedElement.current) {
        previousHighlightedElement.current.classList.remove(
          "tutorial-highlight-enhanced",
        );
        previousHighlightedElement.current.removeAttribute("style");
      }

      if (sidebarUpdateTimer) {
        clearTimeout(sidebarUpdateTimer);
      }

      // Remove resize listener for all placements
      window.removeEventListener("resize", updatePositions);

      // Remove scroll listener only if it was added
      if (currentStepData.placement !== "center") {
        window.removeEventListener("scroll", updatePositions);
      }
    };
  }, [isActive, currentStep, currentStepData, sidebarState]);

  // Final cleanup on unmount
  useEffect(() => {
    return () => {
      if (previousHighlightedElement.current) {
        previousHighlightedElement.current.classList.remove(
          "tutorial-highlight-enhanced",
        );
        previousHighlightedElement.current.removeAttribute("style");
      }
    };
  }, []);

  if (!isActive || !currentStepData || isSmallScreen) return null;

  return {
    spotlightPosition,
    currentStepData,
    tooltipRef,
    tooltipPosition,
    skipTutorial,
    parsedContent,
    steps,
    currentStep,
    handlePrevStep,
    handleNextStep,
  };
}

export { useTutorialComponent };
