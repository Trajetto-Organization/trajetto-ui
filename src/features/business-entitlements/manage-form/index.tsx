"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "react-query";

import { Loader, Package, Truck } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Switch } from "@/components/ui/switch";

import { updateBusinessEntitlement } from "@/actions/business/entitlements";
import { isStaleActionResult } from "@/lib/action-result";
import { fetchBusinessEntitlements } from "@/lib/business-reads";

import { DisableModuleDialog } from "../disable-dialog";

interface ModuleDescriptor {
  module: string;
  label: string;
  description: string;
  icon: typeof Package;
}

/**
 * Every sellable module, in display order. Turning one off takes effect at
 * once: the API refuses its routes and connected users lose the menu — and
 * the page, if they are standing on it.
 */
const MODULES: ModuleDescriptor[] = [
  {
    module: "FLEET",
    label: "Gestão de Frota",
    description:
      "Abastecimentos, checklists, ordens de serviço, peças, fornecedores, contas a pagar e multas.",
    icon: Truck,
  },
  {
    module: "DELIVERIES",
    label: "Entregas",
    description:
      "Entregas, embarcadores, tipos de ocorrência e importação de XML de NF-e.",
    icon: Package,
  },
];

interface ManageEntitlementsFormProps {
  businessId: string;
  businessName: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * MASTER dialog: which modules this company hired. Toggles apply
 * immediately — a plan change is a single deliberate action, not a form to
 * fill. The switch moves when the API confirms; a refusal leaves it as it
 * was, and the refetch afterwards reconciles either way.
 */
const ManageEntitlementsForm = ({
  businessId,
  businessName,
  isOpen,
  onClose,
}: ManageEntitlementsFormProps): JSX.Element => {
  const queryClient = useQueryClient();
  const [pendingModule, setPendingModule] = useState<string | null>(null);

  // Switching a module off removes access from a whole company in real time,
  // so it goes through a confirmation carrying the real numbers. Switching
  // one on is additive and stays a single click.
  const [moduleToDisable, setModuleToDisable] =
    useState<ModuleDescriptor | null>(null);

  const { data: response, isLoading } = useQuery(
    ["business-entitlements", businessId],
    // A relay GET (lib/business-reads): a refusal rejects, so a refetch
    // (the one after each toggle) keeps the modules it last read instead of
    // replacing them with "every module off".
    async ({ signal }) => ({
      data: await fetchBusinessEntitlements(businessId, { signal }),
    }),
    { enabled: isOpen, refetchOnWindowFocus: false },
  );

  const enabledByModule = new Map(
    (response?.data?.modules ?? []).map((row) => [row.module, row.enabled]),
  );

  const applyToggle = async (module: string, enabled: boolean) => {
    setPendingModule(module);

    try {
      const result = await updateBusinessEntitlement(
        businessId,
        module,
        enabled,
      );

      if (isStaleActionResult(result)) return;

      if (result.success) {
        // The switch shows the answer now, not when the refetch lands: that
        // refetch used to be a Server Action, queued behind whatever the
        // router was doing (the plan change also refreshes the MASTER's
        // screens), and a toast saying "atualizado" beside a switch still
        // off read as a failure for as long as it took.
        queryClient.setQueryData<typeof response>(
          ["business-entitlements", businessId],
          (current) =>
            current?.data
              ? {
                  ...current,
                  data: {
                    ...current.data,
                    modules: current.data.modules.some(
                      (row) => row.module === module,
                    )
                      ? current.data.modules.map((row) =>
                          row.module === module ? { ...row, enabled } : row,
                        )
                      : [...current.data.modules, { module, enabled }],
                  },
                }
              : current,
        );

        toast.success(result.message);
        setModuleToDisable(null);
      } else {
        toast.error(result.message);
      }
    } finally {
      setPendingModule(null);
      void queryClient.invalidateQueries(["business-entitlements", businessId]);
    }
  };

  const handleToggle = (descriptor: ModuleDescriptor, enabled: boolean) => {
    if (!enabled) {
      setModuleToDisable(descriptor);
      return;
    }

    void applyToggle(descriptor.module, true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-lg"
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl">Módulos Contratados</DialogTitle>
          <DialogDescription className="break-words text-sm text-muted-foreground">
            Habilite ou desabilite os módulos de{" "}
            <strong title={businessName}>{businessName}</strong>
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            {MODULES.map((descriptor) => {
              const enabled = enabledByModule.get(descriptor.module) ?? false;
              const Icon = descriptor.icon;

              return (
                <div
                  key={descriptor.module}
                  className="flex items-start justify-between gap-4
                  rounded-lg border p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-md bg-primary/10 p-2">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{descriptor.label}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {descriptor.description}
                      </p>
                    </div>
                  </div>

                  <Switch
                    checked={enabled}
                    disabled={pendingModule !== null}
                    onCheckedChange={(value) => handleToggle(descriptor, value)}
                    aria-label={`Alternar módulo ${descriptor.label}`}
                  />
                </div>
              );
            })}

            <p className="pt-1 text-xs text-muted-foreground">
              Cadastro de veículos, motoristas, filiais e usuários não depende
              de módulo — os dois planos usam essa base.
            </p>
          </div>
        )}

        {moduleToDisable && (
          <DisableModuleDialog
            businessId={businessId}
            businessName={businessName}
            module={moduleToDisable.module}
            moduleLabel={moduleToDisable.label}
            isOpen={Boolean(moduleToDisable)}
            isPending={pendingModule === moduleToDisable.module}
            onCancel={() => setModuleToDisable(null)}
            onConfirm={() => void applyToggle(moduleToDisable.module, false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export { ManageEntitlementsForm };
