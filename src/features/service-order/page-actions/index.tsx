"use client";

import { useSearchParams } from "next/navigation";

import { PageActions } from "@/app/(protected)/_components/layout/protected-page-toolbar";
import { DataTableRevalidate } from "@/app/(protected)/_components/shared/tanstack-table/data-table-revalidate";
import { ExportButton } from "@/app/(protected)/_components/shared/custom/export-button";

import { handleExportServiceOrder } from "@/actions/service-order/export-service-order";

import { permissions } from "@/lib/permissions";
import { useHasPermission } from "@/lib/user-has-permission";

import { CreateServiceOrderDialog } from "../create-form";
import { useFleetBusinessId } from "../hooks/use-fleet-business-id";
import type { FleetScope } from "../lib/service-order-rules";
import { serviceOrderListQuery } from "../server-table";

interface ServiceOrderPageActionsProps {
  scope: FleetScope;
  hasData: boolean;
}

/**
 * Exportar, Atualizar and Criar, on the company selector's line on /admin
 * (h-9, decision 16.61) and stacked at full width with labels on a phone.
 * The export carries the company and the table's filters, so the file holds
 * what the screen shows (decision 5.8); the admin copy exported every
 * company at once.
 */
const ServiceOrderPageActions = ({
  scope,
  hasData,
}: ServiceOrderPageActionsProps): JSX.Element => {
  const businessId = useFleetBusinessId(scope);
  const searchParams = useSearchParams();

  const canExport = useHasPermission(permissions.SERVICE_ORDER_MANAGE, "write");

  return (
    <PageActions>
      <ExportButton
        hasData={hasData}
        entityName="relatório de ordens de serviço"
        writePermission={canExport}
        exportAction={(search, format) =>
          handleExportServiceOrder(search, format, {
            businessId: scope === "admin" ? businessId : undefined,
            filters: serviceOrderListQuery(searchParams),
          })
        }
      />

      <DataTableRevalidate
        rateLimit={{
          storageKey: "service-order",
          maxClicks: 3,
          timeWindowMs: 30000,
          cooldownTimeMs: 15000,
        }}
      />

      {businessId && (
        <CreateServiceOrderDialog scope={scope} businessId={businessId} />
      )}
    </PageActions>
  );
};

export { ServiceOrderPageActions };
