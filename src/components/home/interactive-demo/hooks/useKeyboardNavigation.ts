import { useEffect } from "react";

interface UseKeyboardNavigationProps {
  currentStep: number;
  totalSteps: number;
  isPlaying: boolean;
  prevStep: () => void;
  nextStep: () => void;
  startAutoTour: () => void;
  pauseAutoTour: () => void;
}

const useKeyboardNavigation = ({
  currentStep,
  totalSteps,
  isPlaying,
  prevStep,
  nextStep,
  startAutoTour,
  pauseAutoTour,
}: UseKeyboardNavigationProps) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Avoid conflicts with other input elements
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          if (currentStep > 0) {
            prevStep();
          }
          break;
        case "ArrowRight":
          event.preventDefault();
          if (currentStep < totalSteps - 1) {
            nextStep();
          }
          break;
        case " ":
        case "Spacebar":
          event.preventDefault();
          if (isPlaying) {
            pauseAutoTour();
          } else {
            startAutoTour();
          }
          break;
        case "Escape":
          event.preventDefault();
          if (isPlaying) {
            pauseAutoTour();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    currentStep,
    totalSteps,
    isPlaying,
    prevStep,
    nextStep,
    startAutoTour,
    pauseAutoTour,
  ]);
};

export { useKeyboardNavigation };
