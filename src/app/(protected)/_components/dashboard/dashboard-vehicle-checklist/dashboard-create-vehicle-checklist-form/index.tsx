import { useAuthStore } from "@/store/auth-store";
import { CreateVehicleChecklistForm } from "@/features/vehicle-checklist/create-form";

/**
 * Thin binding of the unified checklist form to the dashboard route: the
 * business comes from the session, so the wizard starts at branch selection
 * and the trigger is permission-gated inside the feature. The implementation
 * lives in `features/vehicle-checklist` — do not grow route-specific code
 * here.
 */
const DashboardCreateVehicleChecklistForm = (): JSX.Element => {
  const { businessId } = useAuthStore();

  return (
    <CreateVehicleChecklistForm
      scope={{ kind: "business", businessId: businessId as string }}
    />
  );
};

export { DashboardCreateVehicleChecklistForm };
