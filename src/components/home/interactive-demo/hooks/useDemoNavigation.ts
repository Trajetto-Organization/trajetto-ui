import { useState, useEffect } from "react";
import { DemoStep } from "../types";

const useDemoNavigation = (demoSteps: DemoStep[]) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const nextStep = () => {
    if (currentStep < demoSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const startAutoTour = () => {
    setIsPlaying(true);
    setCurrentStep(0);
  };

  const pauseAutoTour = () => {
    setIsPlaying(false);
  };

  // Auto tour functionality
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev < demoSteps.length - 1) {
            return prev + 1;
          } else {
            setIsPlaying(false);
            return 0;
          }
        });
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, demoSteps.length]);

  return {
    currentStep,
    setCurrentStep,
    isPlaying,
    nextStep,
    prevStep,
    startAutoTour,
    pauseAutoTour,
  };
};

export { useDemoNavigation };
