/**
 * What the create and update server actions answer, in one shape the forms
 * read. The two actions name their error bag differently (a legacy of the
 * two copies); `normalizeServiceOrderState` maps both onto this.
 */
interface ServiceOrderFieldErrors {
  date?: string[];
  completion_date?: string[];
  maintenance_type?: string[];
  total_amount?: string[];
  description?: string[];
  current_mileage_at_service?: string[];
  maintenance_interval_km_at_service?: string[];
  last_maintenance_mileage_at_service?: string[];
  new_mileage_after_service?: string[];
  vehicleId?: string[];
  responsibleUserId?: string[];
  branchId?: string[];
  supplierId?: string[];
  latitude?: string[];
  longitude?: string[];
}

interface ServiceOrderFormState {
  serviceOrderError?: ServiceOrderFieldErrors;
  errorMessage?: string;
  successMessage?: string;
}

interface RawActionState {
  createServiceOrderError?: ServiceOrderFieldErrors & {
    createServiceOrderErrorMessage?: string;
  };
  updateServiceOrderError?: ServiceOrderFieldErrors & {
    updateServiceOrderErrorMessage?: string;
  };
  successMessage?: string;
}

function normalizeServiceOrderState(
  raw: RawActionState | null | undefined,
): ServiceOrderFormState {
  if (!raw) return {};

  const bag = raw.createServiceOrderError ?? raw.updateServiceOrderError;

  if (!bag) return { successMessage: raw.successMessage };

  const {
    createServiceOrderErrorMessage,
    updateServiceOrderErrorMessage,
    ...fields
  } = bag as ServiceOrderFieldErrors & {
    createServiceOrderErrorMessage?: string;
    updateServiceOrderErrorMessage?: string;
  };

  return {
    serviceOrderError: fields,
    errorMessage:
      createServiceOrderErrorMessage ?? updateServiceOrderErrorMessage,
    successMessage: raw.successMessage,
  };
}

export {
  normalizeServiceOrderState,
  type RawActionState,
  type ServiceOrderFieldErrors,
  type ServiceOrderFormState,
};
