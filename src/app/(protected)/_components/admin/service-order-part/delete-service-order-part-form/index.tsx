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

import { useDeleteServiceOrderPartForm } from "./hooks";
import { handleDeleteServiceOrderPart } from "@/actions/delete-service-order-part";

interface DeleteServiceOrderPartProps {
  businessId: string;
  serviceOrderPartId: string;
  serviceOrderId: string;
}

const DeleteServiceOrderPartFormContainer = (): JSX.Element => {
  const { pending } = useFormStatus();

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Deletar Ordem de Serviço Por Peça</AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div>
            A exclusão desta peça da ordem de serviço removerá permanentemente
            este registro específico.
            <span className="block mt-4 font-medium text-foreground">
              Validações e consequências:
            </span>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>
                Verifica se a ordem de serviço pertence à empresa antes de
                deletar
              </li>
              <li>
                Verifica se a peça realmente pertence à ordem de serviço
                especificada
              </li>
              <li>
                O valor total da ordem de serviço será recalculado
                automaticamente
              </li>
              <li>O estoque da peça não será reajustado automaticamente</li>
              <li>
                O registro de utilização da peça será removido do histórico da
                ordem
              </li>
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
          <span>Deletar Ordem de Serviço Por Peça</span>

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

const DeleteServiceOrderPartForm = ({
  businessId,
  serviceOrderPartId,
  serviceOrderId,
}: DeleteServiceOrderPartProps): JSX.Element => {
  const [state, dispatch] = useFormState(
    () =>
      handleDeleteServiceOrderPart({
        businessId,
        serviceOrderPartId,
        serviceOrderId,
      }),
    null,
  );

  const { handleDeleteServiceOrderPartForm, isOpenDeleteServiceOrderPartForm } =
    useDeleteServiceOrderPartForm(state);

  return (
    <AlertDialog
      open={isOpenDeleteServiceOrderPartForm}
      onOpenChange={handleDeleteServiceOrderPartForm}
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
          <DeleteServiceOrderPartFormContainer />
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export { DeleteServiceOrderPartForm };
