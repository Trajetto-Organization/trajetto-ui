import { forwardRef } from "react";
import type {
  DemoStep,
  TooltipPosition,
  ArrowPosition,
  ArrowConfig,
} from "../shared/common.types";

interface DemoTooltipProps {
  currentStep: DemoStep | undefined;
  tooltipPosition: TooltipPosition;
  arrowPosition: ArrowPosition;
  arrowConfig: ArrowConfig;
}

const DemoTooltip = forwardRef<HTMLDivElement, DemoTooltipProps>(
  (
    { currentStep, tooltipPosition, arrowPosition, arrowConfig },
    ref,
  ): JSX.Element => {
    // Rendered always and toggled with `hidden` instead of being unmounted:
    // that is what lets CSS animate it OUT. See `.toggle` in globals.css.
    return (
      <div
        ref={ref}
        hidden={!currentStep?.tooltip}
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
        }}
        className="toggle toggle-scale toggle-pos
            absolute bg-gradient-to-br from-[#d81b60]
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
            {currentStep?.tooltip?.title}
          </div>
          <div className="text-xs opacity-95 leading-relaxed">
            {currentStep?.tooltip?.content}
          </div>
        </div>

        {/* Arrow pointer - Dynamic */}
        <div
          className={`absolute w-0 h-0 ${arrowConfig.transparentBorders} ${arrowConfig.border} ${arrowConfig.position}`}
          style={{
            ...(arrowConfig.isVertical
              ? { left: arrowPosition.left }
              : { top: arrowPosition.top }),
            transform: arrowConfig.transform,
          }}
        />
      </div>
    );
  },
);

DemoTooltip.displayName = "DemoTooltip";

export { DemoTooltip };
