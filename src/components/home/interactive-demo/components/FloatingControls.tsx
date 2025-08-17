import { motion } from "framer-motion";

import { ArrowLeft, ArrowRight, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FloatingControlsProps {
  currentStep: number;
  totalSteps: number;
  isPlaying: boolean;
  onPrevStep: () => void;
  onNextStep: () => void;
  onStartAutoTour: () => void;
  onPauseAutoTour: () => void;
}

const FloatingControls = ({
  currentStep,
  totalSteps,
  isPlaying,
  onPrevStep,
  onNextStep,
  onStartAutoTour,
  onPauseAutoTour,
}: FloatingControlsProps) => {
  return (
    <div
      className="absolute top-4 right-4 
      z-[200] flex flex-col gap-2"
    >
      {/* Play/Pause Button */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Button
          onClick={isPlaying ? onPauseAutoTour : onStartAutoTour}
          size="sm"
          className={`w-12 h-12 rounded-full shadow-lg 
          hover:shadow-xl transition-all duration-200 ${
            isPlaying
              ? "bg-red-500 hover:bg-red-600 text-white"
              : "bg-[#d81b60] hover:bg-[#c2185b] text-white"
          }`}
          title={
            isPlaying
              ? "Pausar Tour (Espaço)"
              : "Iniciar Tour Automático (Espaço)"
          }
        >
          {isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5" />
          )}
        </Button>
      </motion.div>

      {/* Navigation Controls */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6 }}
        className="flex flex-col gap-1"
      >
        <Button
          onClick={onPrevStep}
          disabled={currentStep === 0}
          size="sm"
          variant="outline"
          className="w-12 h-12 rounded-full bg-white/90 
          backdrop-blur-sm shadow-lg hover:shadow-xl 
          transition-all duration-200 border-2"
          title="Passo Anterior (←)"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>

        <Button
          onClick={onNextStep}
          disabled={currentStep === totalSteps - 1}
          size="sm"
          className="w-12 h-12 rounded-full bg-[#d81b60] 
          hover:bg-[#c2185b] text-white shadow-lg 
          hover:shadow-xl transition-all duration-200"
          title="Próximo Passo (→)"
        >
          <ArrowRight className="w-4 h-4" />
        </Button>
      </motion.div>

      {/* Step Indicator */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.7 }}
        className="bg-white/90 backdrop-blur-sm rounded-full 
        px-3 py-2 shadow-lg text-xs font-medium text-center border"
      >
        {currentStep + 1}/{totalSteps}
      </motion.div>
    </div>
  );
};

export { FloatingControls };
