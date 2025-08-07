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

import { handleDeleteBusiness } from "@/actions/delete-business";
import { useDeleteBusinessForm } from "./hooks";

interface DeleteBusinessProps {
  bussinessId: string;
}

const DeleteBusinessFormContainer = (): JSX.Element => {
  const { pending } = useFormStatus();

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Deletar Empresa</AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div>
            A exclusão desta empresa removerá permanentemente todos os seus
            dados e configurações associadas.
            <span className="block mt-4 font-medium text-foreground">
              Consequências imediatas:
            </span>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>
                Todas as filiais vinculadas a esta empresa serão excluídas
                permanentemente
              </li>
              <li>
                Todos os usuários associados a esta empresa perderão acesso ao
                sistema
              </li>
              <li>
                Todos os perfis de acesso e permissões desta empresa serão
                removidos
              </li>
              <li>
                Todos os veículos, motoristas, peças e tipos de combustível
                serão excluídos
              </li>
              <li>
                Todas as ordens de serviço e registros financeiros serão
                excluídos
              </li>
              <li>
                Todas as atividades, notificações e colunas kanban serão
                removidas
              </li>
              <li>Todas as multas registradas na empresa serão excluídas</li>
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
          <span>Deletar Empresa</span>

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

const DeleteBusinessForm = ({
  bussinessId,
}: DeleteBusinessProps): JSX.Element => {
  const [state, dispatch] = useFormState(
    () => handleDeleteBusiness(bussinessId),
    null,
  );

  const { isOpenDeleteBusinessForm, handleDeleteBusinessForm } =
    useDeleteBusinessForm(state);

  return (
    <AlertDialog
      open={isOpenDeleteBusinessForm}
      onOpenChange={handleDeleteBusinessForm}
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
          <DeleteBusinessFormContainer />
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export { DeleteBusinessForm };
