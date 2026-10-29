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

import { permissions } from "@/lib/permissions";
import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";

import { useScopedBusinessId } from "../hooks/use-scoped-business-id";
import type { AdminScope } from "../lib/scope";
import { UserFormDialog } from "../form-dialog";
import { CreateButtonLabel } from "@/app/(protected)/_components/shared/create-button-label";

interface UserPageActionsProps {
  scope: AdminScope;
}

/**
 * Atualizar and Criar Usuário in the page toolbar (decision 3.6):
 * h-9 on /admin and /dashboard (decision 16.61), stacked full width with their
 * labels on a phone. Creating without the permission stays visible and says
 * why it is disabled.
 */
const UserPageActions = ({ scope }: UserPageActionsProps): JSX.Element => {
  const businessId = useScopedBusinessId(scope);
  const actionClassName = usePageActionClassName();

  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);

  // The dialog opens the profile and driver pickers, so it needs them too.
  const createPermission = useCheckMultiplePermissions([
    {
      key: permissions.USER_REGISTRATION_MANAGE,
      action: "write",
      label: getPermissionName(permissions.USER_REGISTRATION_MANAGE),
    },
    {
      key: permissions.PROFILE_ACCESS_MANAGE,
      action: "read",
      label: getPermissionName(permissions.PROFILE_ACCESS_MANAGE),
    },
    {
      key: permissions.DRIVER_MANAGE,
      action: "read",
      label: getPermissionName(permissions.DRIVER_MANAGE),
    },
  ]);

  const canCreate = createPermission.hasAllPermissions;

  return (
    <PageActions>
      <DataTableRevalidate
        rateLimit={{
          storageKey: `${scope}-user-registration`,
          maxClicks: 3,
          timeWindowMs: 30000,
          cooldownTimeMs: 15000,
        }}
      />

      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            {/* The wrapper is load-bearing: a disabled button fires no
                pointer events, so the tooltip anchors to the div. */}
            <div>
              <Button
                size="sm"
                className={actionClassName}
                disabled={!canCreate || !businessId}
                data-tutorial="create-button"
                onClick={() => setIsCreateOpen(true)}
              >
                <CreateButtonLabel>Criar Usuário</CreateButtonLabel>
              </Button>
            </div>
          </TooltipTrigger>
          {!canCreate && (
            <TooltipContent className="max-w-sm">
              <p>{createPermission.tooltipMessage}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      {isCreateOpen && businessId && (
        <UserFormDialog
          businessId={businessId}
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
        />
      )}
    </PageActions>
  );
};

export { UserPageActions };
