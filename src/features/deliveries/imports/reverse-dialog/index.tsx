"use client";

import { useState } from "react";
import { Loader, ShieldCheck, Undo2 } from "lucide-react";

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

import { toast } from "sonner";
import { useQueryClient } from "react-query";

import { reverseImport, type ReversalResult } from "@/actions/import/reverse-import";
import { revalidateTags } from "@/actions/revalidate";

import { revalidateDataToQueryKeyMap } from "@/lib/query-keys-mapping";

interface ReverseImportDialogProps {
  businessId: string;
  importId: string;
  filename: string;
  imported: number;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Taking an upload back.
 *
 * The dialog says out loud that the undo is PARTIAL, because that is the part
 * people get wrong: a file loaded at 6am and undone at 6:10 is usually
 * untouched, one undone at noon has had half its deliveries worked. Anything
 * somebody already worked stays and is named — an entrega já comprovada é um
 * fato sobre o mundo, e nenhum botão de desfazer apaga um.
 *
 * The result is shown in place rather than as a toast: "3 mantidas" is a list
 * the operator has to act on, and a toast disappears while they are reading it.
 */
const ReverseImportDialog = ({
  businessId,
  importId,
  filename,
  imported,
  isOpen,
  onClose,
}: ReverseImportDialogProps): JSX.Element => {
  const queryClient = useQueryClient();

  const [isPending, setIsPending] = useState<boolean>(false);
  const [result, setResult] = useState<ReversalResult | null>(null);

  const handleReverse = async () => {
    setIsPending(true);

    try {
      const response = await reverseImport(businessId, importId);

      if (!response.success || !response.data) {
        toast.error(response.message);
        return;
      }

      setResult(response.data);
      toast.success(response.message);

      // An upload creates deliveries and routes, so its own list is not the
      // only thing that went stale.
      await revalidateTags(["update-import", "update-delivery"]);

      for (const key of revalidateDataToQueryKeyMap["update-import"]) {
        void queryClient.invalidateQueries([key]);
      }
    } finally {
      setIsPending(false);
    }
  };

  const kept = result
    ? result.keptDeliveries.length + result.keptRoutes.length
    : 0;

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        {result ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-xl">
                <Undo2 className="h-5 w-5 shrink-0" />
                Importação estornada
              </AlertDialogTitle>

              <AlertDialogDescription className="pt-1 text-sm">
                {result.removedDeliveries} entrega(s) e {result.removedRoutes}{" "}
                rota(s) foram removidas.
              </AlertDialogDescription>
            </AlertDialogHeader>

            {kept > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {kept} item(ns) foram mantidos porque já tinham movimento:
                </p>

                <ul className="max-h-64 space-y-1.5 overflow-y-auto">
                  {result.keptDeliveries.map((delivery) => (
                    <li
                      key={delivery.id}
                      className="rounded-md border p-2 text-sm"
                    >
                      <p className="truncate font-medium">
                        {delivery.recipient_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {delivery.reason}
                      </p>
                    </li>
                  ))}

                  {result.keptRoutes.map((route) => (
                    <li key={route.id} className="rounded-md border p-2 text-sm">
                      <p className="truncate font-medium">Rota #{route.code}</p>
                      <p className="text-xs text-muted-foreground">
                        {route.reason}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nada tinha movimento — a importação foi desfeita por completo.
              </p>
            )}

            <AlertDialogFooter>
              <AlertDialogAction onClick={onClose} className="w-full sm:w-auto">
                Fechar
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-xl">
                <Undo2 className="h-5 w-5 shrink-0" />
                Estornar importação
              </AlertDialogTitle>

              <AlertDialogDescription className="pt-1 text-sm">
                Desfaz o que a importação{" "}
                <strong title={filename}>{filename}</strong> criou —{" "}
                {imported} entrega(s) — e nada além disso.
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
                  <strong>O estorno é parcial de propósito.</strong> Só sai o
                  que ninguém tocou: entrega ainda pendente, sem apontamentos e
                  sem ocorrências, e rota ainda planejada. O que já teve
                  movimento fica e aparece na lista, com o motivo.
                </span>
              </p>
            </div>

            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li>• Uma entrega já comprovada nunca é apagada.</li>
              <li>
                • O que sobrar deixa de pertencer a esta importação e não volta
                num estorno futuro.
              </li>
              <li>• Esta ação não pode ser desfeita.</li>
            </ul>

            <AlertDialogFooter className="gap-2 sm:gap-2">
              <AlertDialogCancel
                disabled={isPending}
                className="w-full sm:w-auto"
              >
                Cancelar
              </AlertDialogCancel>

              <AlertDialogAction
                disabled={isPending}
                onClick={(event) => {
                  // Kept open until the request settles: the result list is
                  // the answer, and closing over it would throw it away.
                  event.preventDefault();
                  void handleReverse();
                }}
                className="w-full bg-destructive text-destructive-foreground
                hover:bg-destructive/90 sm:w-auto"
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader className="h-4 w-4 animate-spin" />
                    Estornando...
                  </span>
                ) : (
                  "Estornar"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
};

export { ReverseImportDialog };
