import { useAuthStore } from "@/store/auth-store";
import { useHasPermission } from "@/lib/user-has-permission";

import { permissions } from "@/lib/permissions";
import { DeleteVehicleChecklistForm } from "@/features/vehicle-checklist/delete-form";

interface DashboardDeleteVehicleChecklistProps {
  checklistId: string;
}

/**
 * Thin binding of the unified delete dialog to the dashboard route: the
 * business comes from the session and the trigger honors the granular
 * write permission.
 */
const DashboardDeleteVehicleChecklistForm = ({
  checklistId,
}: DashboardDeleteVehicleChecklistProps): JSX.Element => {
  const { businessId } = useAuthStore();

  const hasUserPermission = useHasPermission(
    permissions.VEHICLE_CHECKLIST_MANAGE,
    "write",
  );

  return (
    <DeleteVehicleChecklistForm
      businessId={businessId as string}
      checklistId={checklistId}
      disabled={!hasUserPermission}
    />
  );
};

export { DashboardDeleteVehicleChecklistForm };
