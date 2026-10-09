"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

import { PageActions } from "@/app/(protected)/_components/layout/protected-page-toolbar";
import { usePageActionClassName } from "@/app/(protected)/_components/layout/protected-page-toolbar/page-toolbar-context";
import { DataTableRevalidate } from "@/app/(protected)/_components/shared/tanstack-table/data-table-revalidate";

import { MasterUserFormDialog } from "../master-form-dialog";
import { CreateButtonLabel } from "@/app/(protected)/_components/shared/create-button-label";

/**
 * Atualizar and Criar Usuário Master in the page toolbar (decision 3.6),
 * full width with their labels on a phone. The page is the MASTER's alone
 * (the route and the API admit nobody else), so there is no permission to
 * check here.
 */
const MasterUserPageActions = (): JSX.Element => {
  const actionClassName = usePageActionClassName();
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);

  return (
    <PageActions>
      <DataTableRevalidate
        rateLimit={{
          storageKey: "master-users",
          maxClicks: 3,
          timeWindowMs: 30000,
          cooldownTimeMs: 15000,
        }}
      />

      <Button
        size="sm"
        className={actionClassName}
        data-tutorial="create-button"
        onClick={() => setIsCreateOpen(true)}
      >
        <CreateButtonLabel>Criar Usuário Master</CreateButtonLabel>
      </Button>

      {isCreateOpen && (
        <MasterUserFormDialog
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
        />
      )}
    </PageActions>
  );
};

export { MasterUserPageActions };
