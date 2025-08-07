"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import {
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  Info,
  Shield,
  CheckCircle,
  Settings,
} from "lucide-react";

import { useTutorial } from "../tutorial-provider";
import { Button } from "@/components/ui/button";

import { Badge } from "@/components/ui/badge";
import { useSidebar } from "@/components/ui/sidebar";

interface SpotlightPosition {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface ParsedContent {
  type: "text" | "list" | "important" | "permissions" | "warning" | "note";
  content: string;
  items?: string[];
}

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

const ContentRenderer = ({ item }: { item: ParsedContent }) => {
  switch (item.type) {
    case "permissions":
      return (
        <div className="tutorial-permission-section-compact">
          <div className="flex items-start gap-2">
            <Shield
              className="w-4 h-4 text-blue-600 
              dark:text-blue-400 mt-0.5 flex-shrink-0"
            />
            <div className="flex-1">
              <Badge
                variant="outline"
                className="text-xs mb-2 border-blue-300 text-blue-700 
                dark:text-blue-300 bg-blue-50 dark:bg-blue-950/30"
              >
                Permissões
              </Badge>
              <p
                className="text-base text-blue-800 
                dark:text-blue-200 leading-relaxed"
              >
                {item.content}
              </p>
            </div>
          </div>
        </div>
      );

    case "warning":
      return (
        <div className="tutorial-warning-section-compact">
          <div className="flex items-start gap-2">
            <AlertTriangle
              className="w-4 h-4 text-amber-600 
              dark:text-amber-400 mt-0.5 flex-shrink-0"
            />
            <div className="flex-1">
              <Badge
                variant="outline"
                className="text-xs mb-2 border-amber-300 text-amber-700 
                dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30"
              >
                Importante
              </Badge>
              <p
                className="text-base text-amber-800 
                dark:text-amber-200 leading-relaxed"
              >
                {item.content}
              </p>
            </div>
          </div>
        </div>
      );

    case "note":
      return (
        <div className="tutorial-info-section-compact">
          <div className="flex items-start gap-2">
            <Info
              className="w-4 h-4 text-emerald-600 
              dark:text-emerald-400 mt-0.5 flex-shrink-0"
            />
            <div className="flex-1">
              <Badge
                variant="outline"
                className="text-xs mb-2 border-emerald-300 text-emerald-700 
                dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30"
              >
                Nota
              </Badge>
              <p
                className="text-base text-emerald-800 
                dark:text-emerald-200 leading-relaxed"
              >
                {item.content}
              </p>
            </div>
          </div>
        </div>
      );

    case "list":
      return (
        <div className="tutorial-list-compact">
          <ul className="space-y-2">
            {item.items?.map((listItem, index) => (
              <li key={index} className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-base text-muted-foreground leading-relaxed">
                  {listItem}
                </span>
              </li>
            ))}
          </ul>
        </div>
      );

    default:
      return (
        <p className="text-base text-muted-foreground leading-relaxed">
          {item.content}
        </p>
      );
  }
};

const TutorialComponent = () => {
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
    const nextAudio = new Audio("/sounds/next-tutorial.mp3");
    nextAudio.preload = "auto";

    nextAudio.volume = 0.5;
    nextSoundRef.current = nextAudio;

    // Create and configure audio for "return"
    const backAudio = new Audio("/sounds/back-tutorial.mp3");
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

    // Only add listeners for non-center placements
    if (currentStepData.placement !== "center") {
      window.addEventListener("resize", updatePositions);
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

      if (currentStepData.placement !== "center") {
        window.removeEventListener("resize", updatePositions);
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

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[99999]"
      >
        {/* Dark overlay with cutout */}
        <div
          className="absolute inset-0 tutorial-backdrop"
          style={{
            backgroundColor: spotlightPosition
              ? "transparent"
              : "rgba(0, 0, 0, 0.6)",
            backdropFilter: spotlightPosition ? "none" : "blur(2px)",
          }}
        >
          {spotlightPosition && (
            <svg
              className="absolute inset-0 w-full h-full"
              style={{ pointerEvents: "none" }}
            >
              <defs>
                <mask id="spotlight-mask">
                  <rect x="0" y="0" width="100%" height="100%" fill="white" />
                  <rect
                    x={spotlightPosition.left}
                    y={spotlightPosition.top}
                    width={spotlightPosition.width}
                    height={spotlightPosition.height}
                    rx="8"
                    fill="black"
                  />
                </mask>
              </defs>
              <rect
                x="0"
                y="0"
                width="100%"
                height="100%"
                fill="rgba(0, 0, 0, 0.6)"
                mask="url(#spotlight-mask)"
              />
            </svg>
          )}
        </div>

        {/* Highlight border */}
        {spotlightPosition && currentStepData.placement !== "center" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="absolute tutorial-enhanced-spotlight pointer-events-none"
            style={{
              top: spotlightPosition.top,
              left: spotlightPosition.left,
              width: spotlightPosition.width,
              height: spotlightPosition.height,
            }}
          />
        )}

        {/* Tooltip */}
        <motion.div
          ref={tooltipRef}
          initial={{
            opacity: 0,
            y: currentStepData.placement === "center" ? 0 : 20,
            scale: currentStepData.placement === "center" ? 0.95 : 1,
          }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
          }}
          transition={{
            delay: currentStepData.placement === "center" ? 0.05 : 0.1,
            duration: currentStepData.placement === "center" ? 0.25 : 0.3,
            ease: "easeOut",
          }}
          className="absolute tutorial-tooltip-compact 
          rounded-lg shadow-2xl max-w-md z-[99999999] 
          max-h-[70vh] overflow-hidden"
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
          }}
        >
          {/* Compact header */}
          <div
            className="flex items-center 
            justify-between p-3 pb-2 
            border-b border-border/50"
          >
            <div className="flex items-center gap-2 flex-1">
              <div
                className="p-1.5 bg-gradient-to-br 
                from-primary/20 to-primary/10 rounded-md shrink-0"
              >
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h3
                  className="text-base font-semibold 
                  text-foreground leading-tight"
                >
                  {currentStepData.title}
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs text-muted-foreground">
                    {currentStep + 1} de {steps.length}
                  </span>
                  <Settings className="w-2.5 h-2.5 text-muted-foreground" />
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={skipTutorial}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Compact content */}
          <div
            className="p-4 max-h-[40vh] 
            overflow-y-auto tutorial-content-scroll"
          >
            <div className="space-y-3">
              {parsedContent.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <ContentRenderer item={item} />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Compact Footer */}
          <div
            className="p-3 pt-2 space-y-3 border-t 
            border-border/50 bg-muted/20"
          >
            {/* Progress */}
            <div className="flex gap-1">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-1.5 flex-1 rounded-full 
                  transition-all duration-500 ${
                    index === currentStep
                      ? "tutorial-progress-enhanced"
                      : index < currentStep
                        ? "bg-primary/60"
                        : "bg-muted"
                  }`}
                />
              ))}
            </div>

            {/* Navigation buttons */}
            <div
              className="flex items-center 
              justify-between"
            >
              <div>
                {currentStep > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevStep}
                    className="h-8 text-sm"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                )}
              </div>

              <Button
                size="sm"
                onClick={handleNextStep}
                className="ml-auto tutorial-button-primary 
                h-8 text-sm"
              >
                {currentStep === steps.length - 1 ? (
                  "Concluir"
                ) : (
                  <>
                    Próximo
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </div>

            {/* Skip button */}
            {currentStep === 0 && (
              <button
                onClick={skipTutorial}
                className="tutorial-skip-hover text-xs 
                text-muted-foreground hover:text-foreground 
                transition-colors w-full text-center pt-1.5"
              >
                Pular tutorial • Pressione{" "}
                <span className="tutorial-keyboard-hint">ESC</span> para sair
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TutorialComponent;
