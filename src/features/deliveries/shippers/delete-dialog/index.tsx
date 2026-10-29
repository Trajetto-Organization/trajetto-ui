"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Loader, ShieldAlert } from "lucide-react";

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
import { handleDeleteShipper } from "@/actions/shipper/delete-shipper";

import { useDeleteShipperForm } from "./hooks";
import { guardFormAction } from "@/lib/action-result";

interface DeleteShipperDialogProps {
  businessId: string;
  shipperId: string;
  shipperName: string;
  isOpen: boolean;
  onClose: () => void;
}

const DeleteShipperFormSubmit = ({
  shipperName,
}: {
  shipperName: string;
}): JSX.Element => {
  const { pending } = useFormStatus();

  const deleteShipperList = [
    {
      data: "<strong>Validação prévia:</strong> a exclusão falha se houver qualquer entrega vinculada, e a mensagem informa quantas são",
    },
    {
      data: "O embarcador deixa de aparecer no cadastro de novas entregas e na importação de XML",
    },
    {
      data: "Notas fiscais desse emitente importadas depois criarão um embarcador novo, sem o histórico do atual",
    },
    {
      data: "<strong>Alternativa:</strong> desative o embarcador pela edição — ele sai dos novos cadastros e o histórico permanece",
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
        <AlertDialogTitle>Deletar Embarcador</AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div>
            Esta ação removerá permanentemente o embarcador{" "}
            <span className="font-medium text-foreground">{shipperName}</span>{" "}
            do cadastro da empresa.
            <span className="block mt-4 font-medium text-foreground">
              Validações e consequências:
            </span>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              {deleteShipperList.map(({ data }, idx) => (
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
          <span>Deletar Embarcador</span>

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

const DeleteShipperDialog = ({
  businessId,
  shipperId,
  shipperName,
  isOpen,
  onClose,
}: DeleteShipperDialogProps): JSX.Element => {
  const [state, dispatch] = useFormState(
    guardFormAction(() => handleDeleteShipper({ businessId, shipperId })),
    null,
  );

  useDeleteShipperForm(state, onClose);

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="bg-background">
        <form action={dispatch}>
          <DeleteShipperFormSubmit shipperName={shipperName} />
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export { DeleteShipperDialog };
