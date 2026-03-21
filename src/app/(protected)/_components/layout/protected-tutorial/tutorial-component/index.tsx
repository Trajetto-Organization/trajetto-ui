"use client";

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

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import type { ParsedContent } from "./tutorial-component.types";
import { useTutorialComponent } from "./hooks";

const ContentRenderer = ({ item }: { item: ParsedContent }): JSX.Element => {
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
                <CheckCircle
                  className="w-4 h-4 text-primary 
                  mt-0.5 flex-shrink-0"
                />
                <span
                  className="text-base 
                  text-muted-foreground leading-relaxed"
                >
                  {listItem}
                </span>
              </li>
            ))}
          </ul>
        </div>
      );
    default:
      return (
        <p
          className="text-base 
          text-muted-foreground leading-relaxed"
        >
          {item.content}
        </p>
      );
  }
};

const TutorialComponent = (): JSX.Element | null => {
  const tutorial = useTutorialComponent();
  if (!tutorial) return null;

  const {
    currentStep,
    currentStepData,
    handleNextStep,
    handlePrevStep,
    parsedContent,
    skipTutorial,
    spotlightPosition,
    steps,
    tooltipPosition,
    tooltipRef,
  } = tutorial;

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
                className="ml-auto text-sm
                tutorial-button-primary h-8"
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
              <div className="w-full text-center pt-1.5">
                <button
                  onClick={skipTutorial}
                  className="tutorial-skip-hover text-xs
                  text-muted-foreground hover:text-foreground
                  transition-colors inline-block"
                >
                  Pular tutorial • Pressione{" "}
                  <span className="tutorial-keyboard-hint">ESC</span> para sair
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TutorialComponent;
