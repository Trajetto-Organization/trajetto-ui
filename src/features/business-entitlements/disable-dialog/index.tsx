"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader, ShieldCheck, Users } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import {
  getModuleImpact,
  type ModuleImpactData,
} from "@/actions/business/entitlements";

interface DisableModuleDialogProps {
  businessId: string;
  businessName: string;
  module: string;
  moduleLabel: string;
  isOpen: boolean;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * The confirmation that stands between a master and switching a module off.
 *
 * It exists because the toggle applied instantly and said nothing, and the
 * question it left unanswered — "am I about to lose this company's data?" —
 * is exactly the one that freezes the hand on the switch. The answer is no,
 * and this dialog says so before anything else, with the real counts behind
 * it so the sentence is verifiable rather than reassuring.
 *
 * Enabling stays instant on purpose: it is additive, and taxing the safe
 * action would only train people to click through dialogs.
 */
const DisableModuleDialog = ({
  businessId,
  businessName,
  module,
  moduleLabel,
  isOpen,
  isPending,
  onCancel,
  onConfirm,
}: DisableModuleDialogProps): JSX.Element => {
  const [impact, setImpact] = useState<ModuleImpactData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    setIsLoading(true);

    const load = async () => {
      const response = await getModuleImpact(businessId, module);

      if (!active) return;

      if (response.success && response.data) {
        setImpact(response.data);
        setErrorMessage(null);
      } else {
        setErrorMessage(response.message);
      }

      setIsLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [isOpen, businessId, module]);

  const records = (impact?.records ?? []).filter((row) => row.count > 0);
  const inFlight = (impact?.inFlight ?? []).filter((row) => row.count > 0);

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-xl">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
            Desabilitar {moduleLabel}?
          </AlertDialogTitle>

          <AlertDialogDescription className="pt-1 text-sm">
            Você está prestes a desabilitar o módulo{" "}
            <strong>{moduleLabel}</strong> de{" "}
            <strong title={businessName}>{businessName}</strong>.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div
          className="rounded-lg border border-emerald-200 bg-emerald-50
          p-3 dark:border-emerald-900 dark:bg-emerald-950/30"
        >
          <p
            className="flex items-start gap-2 text-sm
            text-emerald-800 dark:text-emerald-200"
          >
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <strong>Nenhum dado é apagado.</strong> Os registros continuam no
              sistema e voltam exatamente como estavam se o módulo for
              reabilitado — desabilitar é uma chave, não uma exclusão.
            </span>
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-6">
            <Loader className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Consultando o que depende deste módulo...
            </span>
          </div>
        ) : errorMessage ? (
          <p className="py-4 text-sm text-muted-foreground">{errorMessage}</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">O que sai do ar agora</p>

              <ul className="space-y-1.5">
                <li className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
                    <Users className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">
                      Usuários que perdem itens do menu
                    </span>
                  </span>
                  <Badge variant="outline" className="shrink-0">
                    {impact?.affectedUsers ?? 0}
                  </Badge>
                </li>

                {records.map((row) => (
                  <li
                    key={row.label}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="truncate text-muted-foreground">
                      {row.label}
                    </span>
                    <Badge variant="outline" className="shrink-0">
                      {row.count}
                    </Badge>
                  </li>
                ))}

                {records.length === 0 && (
                  <li className="text-sm text-muted-foreground">
                    Esta empresa ainda não possui registros neste módulo.
                  </li>
                )}
              </ul>
            </div>

            {inFlight.length > 0 && (
              <>
                <Separator />

                <div className="space-y-2">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                    Trabalho em andamento
                  </p>

                  <ul className="space-y-1.5">
                    {inFlight.map((row) => (
                      <li
                        key={row.label}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <span className="truncate text-muted-foreground">
                          {row.label}
                        </span>
                        <Badge
                          variant="outline"
                          className="shrink-0 border-amber-200
                          bg-amber-50 text-amber-800"
                        >
                          {row.count}
                        </Badge>
                      </li>
                    ))}
                  </ul>

                  <p className="text-xs text-muted-foreground">
                    Estes registros ficam congelados no estado atual: não são
                    cancelados nem concluídos, e retomam ao reabilitar.
                  </p>
                </div>
              </>
            )}

            <p className="text-xs text-muted-foreground">
              Os usuários conectados perdem o acesso na hora, e quem estiver em
              uma tela do módulo é redirecionado. Os demais masters e os
              administradores da empresa são avisados, e a mudança fica
              registrada nas atividades.
            </p>
          </div>
        )}

        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel disabled={isPending} className="w-full sm:w-auto">
            Cancelar
          </AlertDialogCancel>

          <AlertDialogAction
            disabled={isPending || isLoading}
            onClick={(event) => {
              // The dialog stays open until the request settles; the parent
              // closes it, so a failed call does not silently vanish.
              event.preventDefault();
              onConfirm();
            }}
            className="w-full bg-destructive text-destructive-foreground
            hover:bg-destructive/90 sm:w-auto"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <Loader className="h-4 w-4 animate-spin" />
                Desabilitando...
              </span>
            ) : (
              `Desabilitar ${moduleLabel}`
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export { DisableModuleDialog };
