import { CreateVehicleChecklistForm as FeatureCreateForm } from "@/features/vehicle-checklist/create-form";

/**
 * Thin binding of the unified checklist form to the admin route: a MASTER
 * picks the company inside the wizard. The implementation lives in
 * `features/vehicle-checklist` — do not grow route-specific code here.
 */
const CreateVehicleChecklistForm = (): JSX.Element => (
  <FeatureCreateForm scope={{ kind: "master" }} />
);

export { CreateVehicleChecklistForm };
