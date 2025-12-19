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

import { Loader, ShieldAlert, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";

import { useDeleteUserForm } from "./hooks";
import { handleDeleteUserRegistration } from "@/actions/delete-user-registration";

interface DeleteUserProps {
  userId: string;
}

const DeleteUserFormSubmit = (): JSX.Element => {
  const { pending } = useFormStatus();

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Deletar Usuário</AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div>
            A exclusão deste usuário removerá permanentemente a conta associada
            <span className="block mt-4 font-medium text-foreground">
              Validações e consequências:
            </span>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>
                <strong>Validação prévia:</strong> Você não pode deletar sua
                própria conta
              </li>
              <li>
                <strong>Validação prévia:</strong> A exclusão falhará se houver
                ordens de serviço onde este usuário é responsável
              </li>
              <li>
                <strong>Validação prévia:</strong> A exclusão falhará se houver
                contas a pagar registradas por este usuário
              </li>
              <li>
                Todas as sessões e tokens de acesso deste usuário serão
                invalidados automaticamente
              </li>
              <li>
                Notificações para este usuário serão excluídas automaticamente
              </li>
              <li>
                Cartões Kanban atribuídos a este usuário serão desvinculados
                automaticamente
              </li>
              <li>
                Confirmações de dois fatores serão excluídas automaticamente
              </li>
              <li>O usuário perderá acesso total à plataforma</li>
              <li>
                Esta ação será registrada nos logs de atividade do sistema
              </li>
              <li>Esta ação não pode ser desfeita</li>
            </ul>
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter className="mt-5">
        <AlertDialogCancel>Cancelar</AlertDialogCancel>

        <Button
          type="submit"
          disabled={pending}
          variant={"secondary"}
          className="bg-red-600/10 dark:bg-red-500/10 dark:text-red-500 text-red-600"
        >
          <ShieldAlert className="mr-1 size-5" />
          <span>Deletar Usuário</span>

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

const DeleteUserForm = ({ userId }: DeleteUserProps): JSX.Element => {
  const [state, dispatch] = useFormState(
    () => handleDeleteUserRegistration(userId),
    null,
  );

  const { isOpenDeleteUserForm, handleDeleteUserForm } =
    useDeleteUserForm(state);

  return (
    <AlertDialog
      open={isOpenDeleteUserForm}
      onOpenChange={handleDeleteUserForm}
    >
      <AlertDialogTrigger asChild>
        <Button
          onClick={handleDeleteUserForm}
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
          <DeleteUserFormSubmit />
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export { DeleteUserForm };
