"use client";

import { useState } from "react";

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

import { useHasPermission } from "@/lib/user-has-permission";
import { permissions } from "@/lib/permissions";

import { useScopedBusinessId } from "../hooks/use-scoped-business-id";
import type { FinanceScope } from "../lib/scope";

import { SupplierFormDialog } from "../form-dialog";
import { CreateButtonLabel } from "@/app/(protected)/_components/shared/create-button-label";

/**
 * Atualizar and Criar on the company selector's line (decision 3.6):
 * h-9 (decision 16.61), full width with the label on a phone. The
 * create button stays visible without the permission and says why (the
 * admin copy had no check).
 */
const SupplierPageActions = ({
  scope,
}: {
  scope: FinanceScope;
}): JSX.Element => {
  const businessId = useScopedBusinessId(scope);
  const canWrite = useHasPermission(permissions.SUPPLIER_MANAGE, "write");
  const buttonClassName = usePageActionClassName();

  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);

  return (
    <PageActions>
      <DataTableRevalidate
        rateLimit={{
          storageKey: "supplier",
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
                  disabled={!canWrite}
                  data-tutorial="create-button"
                  onClick={() => setIsCreateOpen(true)}
                >
                  <CreateButtonLabel>Criar Fornecedor</CreateButtonLabel>
                </Button>
              </div>
            </TooltipTrigger>
            {!canWrite && (
              <TooltipContent className="max-w-sm">
                <p>Você não tem permissão para criar fornecedores.</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      )}

      {isCreateOpen && businessId && (
        <SupplierFormDialog
          businessId={businessId}
          isOpen
          onClose={() => setIsCreateOpen(false)}
        />
      )}
    </PageActions>
  );
};

export { SupplierPageActions };
