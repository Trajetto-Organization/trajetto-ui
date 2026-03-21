import { vehicleChecklistTableSchema } from "@/schemas/vehicle-checklist-table-schema";

interface ChecklistDetailsDialogProps {
  checklistData: vehicleChecklistTableSchema;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export type { ChecklistDetailsDialogProps };
