import { DeleteVehicleChecklistForm as FeatureDeleteForm } from "@/features/vehicle-checklist/delete-form";

interface DeleteVehicleChecklistProps {
  businessId: string;
  checklistId: string;
}

/**
 * Thin binding of the unified delete dialog to the admin route: a MASTER is
 * not permission-gated, and gets the extra cross-tenant caution line.
 */
const DeleteVehicleChecklistForm = ({
  businessId,
  checklistId,
}: DeleteVehicleChecklistProps): JSX.Element => (
  <FeatureDeleteForm
    businessId={businessId}
    checklistId={checklistId}
    warnBusinessOwnership
  />
);

export { DeleteVehicleChecklistForm };
