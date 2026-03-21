import { CommandServiceOrderInputValue } from "@/app/(protected)/_components/shared/common.types";

interface SelectServiceOrderStepProps {
  businessId: string;
  commandServiceOrderInputValue: CommandServiceOrderInputValue;
  handleUpdateSearchServiceOrderInputValue: (
    serviceOrderData: CommandServiceOrderInputValue,
  ) => void;
  onContinue: () => void;
  onBack: () => void;
  errorServiceOrderId?: string[];
  searchServiceOrderIsOptional?: boolean;
}

export type { SelectServiceOrderStepProps };
