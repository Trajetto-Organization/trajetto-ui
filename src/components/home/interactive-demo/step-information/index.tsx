import type { DemoStep } from "../shared/common.types";
import { StepIndicator } from "../step-indicator";

interface StepInformationProps {
  currentStep: number;
  totalSteps: number;
  stepData: DemoStep;
  onStepChange: (step: number) => void;
}

const StepInformation = ({
  currentStep,
  totalSteps,
  stepData,
  onStepChange,
}: StepInformationProps): JSX.Element => {
  return (
    <div className="mt-6 sm:mt-8 lg:mt-10">
      {/* Desktop Layout */}
      <div className="hidden lg:block">
        <div className="text-center mb-6">
          <div
            className="text-xl xl:text-2xl 
            font-bold mb-2 text-foreground"
          >
            {stepData.title}
          </div>
          <div
            className="text-base xl:text-lg 
            text-muted-foreground leading-relaxed"
          >
            {stepData.description}
          </div>
        </div>

        <div className="flex justify-center">
          <StepIndicator
            totalSteps={totalSteps}
            currentStep={currentStep}
            onStepChange={onStepChange}
          />
        </div>
      </div>

      {/* Mobile/Tablet Layout */}
      <div className="lg:hidden space-y-4">
        <div className="text-center px-4">
          <div
            className="text-lg sm:text-xl 
            font-bold mb-2 text-foreground"
          >
            {stepData.title}
          </div>
          <div
            className="text-sm sm:text-base 
            text-muted-foreground leading-relaxed"
          >
            {stepData.description}
          </div>
        </div>

        <div className="flex justify-center">
          <StepIndicator
            totalSteps={totalSteps}
            currentStep={currentStep}
            onStepChange={onStepChange}
            className="p-1.5 sm:p-2"
          />
        </div>
      </div>
    </div>
  );
};

export { StepInformation };
