"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Loader, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

import { handleDeletePart } from "@/actions/part/delete-part";
import { guardFormAction } from "@/lib/action-result";

import { refreshMaintenanceData } from "@/features/service-order/lib/refresh";

import { partDeleteBlockedReason, type PartRow } from "../lib/part-rules";

interface DeleteState {
  deletePartError?: string;
  successMessage?: string;
}

const Footer = ({ blocked }: { blocked: boolean }): JSX.Element => {
  const { pending } = useFormStatus();

  return (
    <>
      <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
      <Button type="submit" disabled={pending || blocked} variant="destructive">
        <ShieldAlert className="mr-1 size-5" />
        <span>Excluir Peça</span>
        {pending && <Loader className="ml-2 h-4 w-4 animate-spin" />}
      </Button>
    </>
  );
};

/** Deleting a part from the catalog, with what is checked first. */
const DeletePartDialog = ({
  part,
  isOpen,
  onClose,
}: {
  part: PartRow;
  isOpen: boolean;
  onClose: () => void;
}): JSX.Element => {
  const [state, dispatch] = useFormState<DeleteState | null, FormData>(
    guardFormAction(() =>
      handleDeletePart({ businessId: part.businessId, partId: part.id }),
    ),
    null,
  );

  const answered = useRef<DeleteState | null>(null);

  useEffect(() => {
    if (!state || answered.current === state) return;
    answered.current = state;

    if (state.deletePartError) {
      toast.error(state.deletePartError);
      return;
    }

    if (state.successMessage) {
      toast.success(state.successMessage);
      onClose();

      refreshMaintenanceData(["part"]).catch(() =>
        toast.error("Erro ao atualizar dados. Recarregue a página."),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const blockedReason = partDeleteBlockedReason(part);

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="bg-background">
        <form action={dispatch}>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Peça</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {blockedReason ? (
                  <p className="font-medium text-destructive">
                    {blockedReason}
                  </p>
                ) : (
                  <p>
                    Esta ação removerá a peça{" "}
                    <span className="font-medium text-foreground">
                      {part.description}
                    </span>{" "}
                    do catálogo.
                  </p>
                )}
                <span className="mt-4 block font-medium text-foreground">
                  Validações e consequências:
                </span>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>
                    <strong>Validação prévia:</strong> a exclusão é recusada se
                    a peça estiver lançada em alguma ordem de serviço, e a
                    mensagem diz em quantas.
                  </li>
                  <li>A peça deixa de aparecer para novos lançamentos.</li>
                  <li>
                    Esta ação será registrada nos logs de atividade do sistema.
                  </li>
                  <li>Esta ação não pode ser desfeita.</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-5">
            <Footer blocked={blockedReason !== null} />
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export { DeletePartDialog };
