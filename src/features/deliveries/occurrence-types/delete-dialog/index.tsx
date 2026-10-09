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
import { handleDeleteOccurrenceType } from "@/actions/occurrence-type/delete-occurrence-type";

import { useQueryClient } from "react-query";
import { revalidateTagName } from "@/actions/revalidate";
import { guardFormAction } from "@/lib/action-result";

interface DeleteOccurrenceTypeDialogProps {
  businessId: string;
  occurrenceTypeId: string;
  occurrenceTypeName: string;
  isOpen: boolean;
  onClose: () => void;
}

const DeleteOccurrenceTypeFormSubmit = ({
  occurrenceTypeName,
}: {
  occurrenceTypeName: string;
}): JSX.Element => {
  const { pending } = useFormStatus();

  const deleteOccurrenceTypeList = [
    {
      data: "<strong>Validação prévia:</strong> a exclusão falha se o tipo já tiver sido usado, e a mensagem informa em quantas ocorrências",
    },
    {
      data: "O tipo deixa de aparecer para o motorista no app e no registro de ocorrências pelo painel",
    },
    {
      data: "Se for impeditivo, entregas deixam de ser marcadas como insucesso por este motivo",
    },
    {
      data: "<strong>Alternativa:</strong> desative o tipo pela edição — ele sai das opções e o histórico continua nomeando o que aconteceu",
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
        <AlertDialogTitle>Deletar Tipo de Ocorrência</AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div>
            Esta ação removerá permanentemente o tipo{" "}
            <span className="font-medium text-foreground">
              {occurrenceTypeName}
            </span>{" "}
            do catálogo da empresa.
            <span className="block mt-4 font-medium text-foreground">
              Validações e consequências:
            </span>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              {deleteOccurrenceTypeList.map(({ data }, idx) => (
                <li key={idx} dangerouslySetInnerHTML={{ __html: data }} />
              ))}
            </ul>
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter className="mt-5">
        <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
        <Button type="submit" disabled={pending} variant="destructive">
          <ShieldAlert className="mr-1 size-5" />
          <span>Deletar Tipo</span>

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

const DeleteOccurrenceTypeDialog = ({
  businessId,
  occurrenceTypeId,
  occurrenceTypeName,
  isOpen,
  onClose,
}: DeleteOccurrenceTypeDialogProps): JSX.Element => {
  const queryClient = useQueryClient();

  const [state, dispatch] = useFormState(
    guardFormAction(() =>
      handleDeleteOccurrenceType({ businessId, occurrenceTypeId }),
    ),
    null,
  );

  const toastShownRef = useRef(false);

  useEffect(() => {
    // The API refuses to delete a type already referenced by occurrences and
    // says how many hold it — that message is the whole point.
    if (state?.deleteOccurrenceTypeError) {
      toast.error(state.deleteOccurrenceTypeError, { duration: 8000 });
      return;
    }

    if (state?.successMessage && !toastShownRef.current) {
      toastShownRef.current = true;
      toast.success(state.successMessage);

      const performRevalidation = async () => {
        try {
          await revalidateTagName("update-occurrence-type");

          // The picker inside the delivery detail keeps its own react-query
          // cache; the server tag alone would leave a deleted type on offer.
          await queryClient.invalidateQueries(["occurrence-types-select"]);
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
      <AlertDialogContent className="bg-background">
        <form action={dispatch}>
          <DeleteOccurrenceTypeFormSubmit
            occurrenceTypeName={occurrenceTypeName}
          />
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export { DeleteOccurrenceTypeDialog };
