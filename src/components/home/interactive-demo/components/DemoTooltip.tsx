import { forwardRef } from "react";

import { motion, AnimatePresence } from "framer-motion";
import {
  DemoStep,
  TooltipPosition,
  ArrowPosition,
  ArrowConfig,
} from "../types";

interface DemoTooltipProps {
  currentStep: DemoStep | undefined;
  tooltipPosition: TooltipPosition;
  arrowPosition: ArrowPosition;
  arrowConfig: ArrowConfig;
}

const DemoTooltip = forwardRef<HTMLDivElement, DemoTooltipProps>(
  ({ currentStep, tooltipPosition, arrowPosition, arrowConfig }, ref) => {
    return (
      <AnimatePresence>
        {currentStep?.tooltip && (
          <motion.div
            ref={ref}
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
              top: tooltipPosition.top,
              left: tooltipPosition.left,
            }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{
              type: "spring",
              damping: 25,
              stiffness: 400,
              duration: 0.15,
            }}
            className="absolute bg-gradient-to-br from-[#d81b60] 
            to-[#c2185b] text-white p-4 rounded-xl 
            shadow-2xl max-w-xs z-[100] pointer-events-none"
          >
            <div className="relative">
              <div
                className="font-semibold mb-2 text-sm 
                flex items-center gap-2"
              >
                <div
                  className="w-2 h-2 bg-white 
                  rounded-full animate-pulse"
                />
                {currentStep.tooltip.title}
              </div>
              <div className="text-xs opacity-95 leading-relaxed">
                {currentStep.tooltip.content}
              </div>
            </div>

            {/* Arrow pointer - Dinâmico */}
            <div
              className={`absolute w-0 h-0 ${arrowConfig.transparentBorders} ${arrowConfig.border} ${arrowConfig.position}`}
              style={{
                ...(arrowConfig.isVertical
                  ? { left: arrowPosition.left }
                  : { top: arrowPosition.top }),
                transform: arrowConfig.transform,
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    );
  },
);

DemoTooltip.displayName = "DemoTooltip";

export { DemoTooltip };
