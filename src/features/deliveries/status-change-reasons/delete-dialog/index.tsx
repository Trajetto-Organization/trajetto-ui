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
import { handleDeleteStatusChangeReason } from "@/actions/status-change-reason/delete-status-change-reason";

import { useQueryClient } from "react-query";
import { revalidateTagName } from "@/actions/revalidate";

interface DeleteStatusChangeReasonDialogProps {
  businessId: string;
  reasonId: string;
  reasonName: string;
  isOpen: boolean;
  onClose: () => void;
}

const DeleteStatusChangeReasonFormSubmit = ({
  reasonName,
}: {
  reasonName: string;
}): JSX.Element => {
  const { pending } = useFormStatus();

  const consequences = [
    {
      data: "<strong>Validação prévia:</strong> a exclusão falha se o motivo já explicar alguma mudança de status, e a mensagem informa em quantas",
    },
    {
      data: "O motivo deixa de aparecer no seletor ao mudar o status de uma entrega pelo painel",
    },
    {
      data: "<strong>Alternativa:</strong> desative o motivo pela edição — ele sai do seletor e continua explicando o histórico que já o cita",
    },
    {
      data: "Esta ação será registrada nos logs de atividade do sistema",
    },
    {
      data: "Esta ação não pode ser desfeita",
    },
  ];

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Deletar Motivo</AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div>
            Esta ação removerá permanentemente o motivo{" "}
            <span className="font-medium text-foreground">{reasonName}</span> do
            catálogo da empresa.
            <span className="block mt-4 font-medium text-foreground">
              Validações e consequências:
            </span>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              {consequences.map(({ data }, idx) => (
                <li key={idx} dangerouslySetInnerHTML={{ __html: data }} />
              ))}
            </ul>
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>

      <AlertDialogFooter className="mt-5">
        <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
        <Button
          type="submit"
          disabled={pending}
          variant={"secondary"}
          className="bg-red-600/10 dark:bg-red-500/10
          dark:text-red-500 text-red-600"
        >
          <ShieldAlert className="mr-1 size-5" />
          <span>Deletar Motivo</span>

          {pending && (
            <div className="animate-spin">
              <Loader />
            </div>
          )}
        </Button>
      </AlertDialogFooter>
    </>
  );
};

const DeleteStatusChangeReasonDialog = ({
  businessId,
  reasonId,
  reasonName,
  isOpen,
  onClose,
}: DeleteStatusChangeReasonDialogProps): JSX.Element => {
  const queryClient = useQueryClient();

  const [state, dispatch] = useFormState(
    () => handleDeleteStatusChangeReason({ businessId, reasonId }),
    null,
  );

  const toastShownRef = useRef(false);

  useEffect(() => {
    // The API refuses to delete a reason already cited by an event and says
    // how many hold it — that message is the whole point.
    if (state?.deleteStatusChangeReasonError) {
      toast.error(state.deleteStatusChangeReasonError, { duration: 8000 });
      return;
    }

    if (state?.successMessage && !toastShownRef.current) {
      toastShownRef.current = true;
      toast.success(state.successMessage);

      const performRevalidation = async () => {
        try {
          await revalidateTagName("update-status-change-reason");
          await queryClient.invalidateQueries(["status_change_reason"]);
        } catch (error: any) {
          if (process.env.NODE_ENV === "development") {
            console.error("Erro na revalidação:", error);
          }

          toast.error("Erro ao atualizar dados. Recarregue a página.");
        }
      };

      performRevalidation();
      onClose();
    }

    return () => {
      toastShownRef.current = false;
    };
  }, [state, onClose]);

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="bg-white dark:bg-[#121214]">
        <form action={dispatch}>
          <DeleteStatusChangeReasonFormSubmit reasonName={reasonName} />
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export { DeleteStatusChangeReasonDialog };
