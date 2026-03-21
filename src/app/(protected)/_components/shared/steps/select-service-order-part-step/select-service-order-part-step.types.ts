import {
  CommandPartInputValue,
  CommandServiceOrderInputValue,
} from "@/app/(protected)/_components/shared/common.types";

interface SelectServiceOrderPartStepProps {
  businessId: string;
  commandServiceOrderInputValue: CommandServiceOrderInputValue;
  commandPartInputValue: CommandPartInputValue;
  handleUpdateSearchServiceOrderInputValue: (
    serviceOrderData: CommandServiceOrderInputValue,
  ) => void;
  handleUpdateSearchPartInputValue: (partData: CommandPartInputValue) => void;
  onContinue: () => void;
  onBack?: () => void;
  errorServiceOrderId?: string[];
  errorPartId?: string[];
  searchServiceOrderIsOptional?: boolean;
  searchPartIsOptional?: boolean;
}

export type { SelectServiceOrderPartStepProps };
