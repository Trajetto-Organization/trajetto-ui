"use client";

import { useState } from "react";
import { useQueryClient } from "react-query";
import { Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useRevalidateScreen } from "@/hooks/use-revalidate-screen";

import { ManageEntitlementsForm } from "@/features/business-entitlements/manage-form";
import {
  selectedBusinessKey,
  type SelectedBusiness,
} from "@/app/(protected)/_components/shared/business-selector/hooks";

interface ManageModulesButtonProps {
  businessId: string;
}

/**
 * The MASTER's way out of "Módulo não contratado" (decision 4.3): the same
 * dialog as Empresas > Módulos Contratados, opened for the selected company.
 * Closing it revalidates the whole tab (decision 2.1): the server content
 * AND the client queries. A screen that asks through react-query
 * (Integrações) kept showing "não contratado" after a router.refresh alone,
 * until somebody pressed Atualizar.
 */
const ManageModulesButton = ({
  businessId,
}: ManageModulesButtonProps): JSX.Element => {
  const { revalidate } = useRevalidateScreen();
  const queryClient = useQueryClient();

  const [isOpen, setIsOpen] = useState(false);

  // The selector caches the company's name by id; nothing to fetch here.
  const businessName =
    queryClient.getQueryData<SelectedBusiness | null>(
      selectedBusinessKey(businessId),
    )?.corporate_reason ?? "a empresa selecionada";

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setIsOpen(true)}>
        <Settings2 className="mr-2 h-4 w-4" aria-hidden />
        Gerenciar módulos
      </Button>

      {isOpen && (
        <ManageEntitlementsForm
          businessId={businessId}
          businessName={businessName}
          isOpen={isOpen}
          onClose={() => {
            setIsOpen(false);
            void revalidate();
          }}
        />
      )}
    </>
  );
};

export { ManageModulesButton };
