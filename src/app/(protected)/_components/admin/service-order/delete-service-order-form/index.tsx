import { useFormState, useFormStatus } from "react-dom";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { Button } from "@/components/ui/button";
import { Loader, ShieldAlert, Trash } from "lucide-react";

import { useDeleteServiceOrderForm } from "./hooks";
import { handleDeleteServiceOrder } from "@/actions/delete-service-order";

interface DeleteServiceOrderProps {
  businessId: string;
  serviceOrderId: string;
}

const DeleteServiceOrderFormSubmit = (): JSX.Element => {
  const { pending } = useFormStatus();

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Deletar Ordem de Serviço</AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div>
            A exclusão desta ordem de serviço removerá permanentemente todos os
            seus dados e configurações associadas.
            <span className="block mt-4 font-medium text-foreground">
              Consequências imediatas:
            </span>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>
                Verifica se a ordem de serviço pertence à empresa antes de
                deletar
              </li>
              <li>
                Todos os registros de peças associadas a esta ordem serão
                excluídos automaticamente
              </li>
              <li>
                Contas a pagar vinculadas a esta ordem de serviço serão
                excluídas automaticamente
              </li>
              <li>O histórico de manutenção do veículo será impactado</li>
              <li>
                Esta ação será registrada nos logs de atividade do sistema
              </li>
              <li>Esta ação não pode ser desfeita</li>
            </ul>
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter className="mt-6">
        <AlertDialogCancel>Cancelar</AlertDialogCancel>

        <Button
          type="submit"
          disabled={pending}
          variant={"secondary"}
          className="bg-red-600/10 dark:bg-red-500/10 
          dark:text-red-500 text-red-600"
        >
          <ShieldAlert className="mr-1 size-5" />
          <span>Deletar Ordem de Serviço</span>

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

const DeleteServiceOrderForm = ({
  businessId,
  serviceOrderId,
}: DeleteServiceOrderProps): JSX.Element => {
  const [state, dispatch] = useFormState(
    () => handleDeleteServiceOrder({ businessId, serviceOrderId }),
    null,
  );

  const { handleDeleteServiceOrderForm, isOpenDeleteServiceOrderForm } =
    useDeleteServiceOrderForm(state);

  return (
    <AlertDialog
      open={isOpenDeleteServiceOrderForm}
      onOpenChange={handleDeleteServiceOrderForm}
    >
      <AlertDialogTrigger asChild>
        <Button
          className="w-full text-sm rounded-sm px-2 
          h-8 font-normal flex justify-between"
          variant={"ghost"}
        >
          Deletar
          <Trash size={17} className="dark:text-red-500 text-red-600" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-white dark:bg-[#121214]">
        <form action={dispatch}>
          <DeleteServiceOrderFormSubmit />
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export { DeleteServiceOrderForm };
