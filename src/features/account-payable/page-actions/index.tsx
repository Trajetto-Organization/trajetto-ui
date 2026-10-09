"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { PageActions } from "@/app/(protected)/_components/layout/protected-page-toolbar";
import { usePageActionClassName } from "@/app/(protected)/_components/layout/protected-page-toolbar/page-toolbar-context";
import { DataTableRevalidate } from "@/app/(protected)/_components/shared/tanstack-table/data-table-revalidate";
import { ExportButton } from "@/app/(protected)/_components/shared/custom/export-button";
import type { ExportFormat } from "@/app/(protected)/_components/shared/custom/export-button/export-button.types";

import { handleExportAccountPayable } from "@/actions/account-payable/export-account-payable";

import { permissions } from "@/lib/permissions";
import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";

import { useScopedBusinessId } from "@/features/supplier/hooks/use-scoped-business-id";
import type { FinanceScope } from "@/features/supplier/lib/scope";

import { AccountPayableFormDialog } from "../form-dialog";
import { accountPayableListQuery } from "../lib/server-table";
import { CreateButtonLabel } from "@/app/(protected)/_components/shared/create-button-label";

interface AccountPayablePageActionsProps {
  scope: FinanceScope;
  /** Whether the list has any row: an empty report is refused anyway. */
  hasData: boolean;
}

/**
 * Exportar, Atualizar and Criar on the company selector's line (decision
 * 3.6). The export sends the list's search, filters and order and, on
 * /admin, the selected company (decision 5.8) — the report is what the
 * screen shows. Exporting is a write, like every other export. Blocked
 * buttons stay visible and say why.
 */
const AccountPayablePageActions = ({
  scope,
  hasData,
}: AccountPayablePageActionsProps): JSX.Element => {
  const businessId = useScopedBusinessId(scope);
  const searchParams = useSearchParams();
  const buttonClassName = usePageActionClassName();

  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);

  const createPermissions = useCheckMultiplePermissions([
    {
      key: permissions.ACCOUNT_PAYABLE_MANAGE,
      action: "write",
      label: getPermissionName(permissions.ACCOUNT_PAYABLE_MANAGE),
    },
    {
      key: permissions.BRANCH_MANAGE,
      action: "read",
      label: getPermissionName(permissions.BRANCH_MANAGE),
    },
    {
      key: permissions.USER_REGISTRATION_MANAGE,
      action: "read",
      label: getPermissionName(permissions.USER_REGISTRATION_MANAGE),
    },
  ]);

  const exportPermissions = useCheckMultiplePermissions([
    {
      key: permissions.ACCOUNT_PAYABLE_MANAGE,
      action: "write",
      label: getPermissionName(permissions.ACCOUNT_PAYABLE_MANAGE),
    },
  ]);

  const exportAction = (search?: string, format?: ExportFormat) =>
    handleExportAccountPayable({
      businessId: scope === "admin" ? businessId : undefined,
      search,
      format,
      filters: accountPayableListQuery(searchParams),
    });

  return (
    <PageActions>
      <ExportButton
        hasData={hasData}
        exportAction={exportAction}
        entityName="relatório de contas a pagar"
        writePermission={exportPermissions.hasAllPermissions}
      />

      <DataTableRevalidate
        rateLimit={{
          storageKey: "account-payable",
          maxClicks: 3,
          timeWindowMs: 30000,
          cooldownTimeMs: 15000,
        }}
      />

      {businessId && (
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Button
                  size="sm"
                  className={buttonClassName}
                  disabled={!createPermissions.hasAllPermissions}
                  data-tutorial="create-button"
                  onClick={() => setIsCreateOpen(true)}
                >
                  <CreateButtonLabel>Criar Conta a Pagar</CreateButtonLabel>
                </Button>
              </div>
            </TooltipTrigger>
            {!createPermissions.hasAllPermissions && (
              <TooltipContent className="max-w-sm">
                <p>{createPermissions.tooltipMessage}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      )}

      {isCreateOpen && businessId && (
        <AccountPayableFormDialog
          businessId={businessId}
          isOpen
          onClose={() => setIsCreateOpen(false)}
        />
      )}
    </PageActions>
  );
};

export { AccountPayablePageActions };
