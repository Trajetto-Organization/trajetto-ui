interface StepIndicatorProps {
  totalSteps: number;
  currentStep: number;
  onStepChange: (step: number) => void;
  className?: string;
}

const StepIndicator = ({
  totalSteps,
  currentStep,
  onStepChange,
  className = "",
}: StepIndicatorProps): JSX.Element => {
  return (
    <div
      className={`flex items-center space-x-3 
      bg-muted p-2 rounded-full ${className}`}
    >
      {Array.from({ length: totalSteps }, (_, index) => (
        <button
          key={index}
          onClick={() => onStepChange(index)}
          className={`w-3.5 h-3.5 rounded-full 
          transition-all duration-300 hover:scale-110 ${
            index === currentStep
              ? "bg-[#d81b60] shadow-lg"
              : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
          }`}
          aria-label={`Ir para passo ${index + 1}`}
        />
      ))}
    </div>
  );
};

export { StepIndicator };
