import { AccessErrorState } from "@/components/shared/custom/access-error-state";
import { ManageModulesButton } from "@/components/shared/custom/access-error-state/manage-modules-button";

import type { AccessError } from "@/lib/access-error";

import type { FleetScope } from "../lib/service-order-rules";

interface MaintenanceAccessErrorProps {
  error: AccessError;
  mode: FleetScope;
  /** The company picked at the top of /admin; absent on /dashboard. */
  businessId?: string;
}

/**
 * The three kinds of 403 on the maintenance screens (decision 4.1). On
 * /admin the MASTER also gets the way out of "Módulo não contratado": the
 * Módulos Contratados dialog for the selected company (decision 4.3). The
 * company user has nothing to enable, so no button there.
 */
const MaintenanceAccessError = ({
  error,
  mode,
  businessId,
}: MaintenanceAccessErrorProps): JSX.Element => (
  <AccessErrorState
    kind={error.kind}
    moduleLabel="Gestão de Frota"
    audience={mode === "admin" ? "master" : "company"}
    message={error.message}
    action={
      error.kind === "module-not-enabled" && mode === "admin" && businessId ? (
        <ManageModulesButton businessId={businessId} />
      ) : undefined
    }
  />
);

export { MaintenanceAccessError };
