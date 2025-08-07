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
import { useDeleteProfileAccessForm } from "./hooks";

import { Button } from "@/components/ui/button";
import { handleDeleteProfileAccess } from "@/actions/delete-profile-access";

interface DeleteProfileAccessProps {
  profileAccessId: string;
}

const DeleteProfileAccessFormContainer = (): JSX.Element => {
  const { pending } = useFormStatus();

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Deletar Perfil De Acesso</AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div>
            Esta ação removerá permanentemente o perfil de acesso e todas as
            suas permissões associadas.
            <span className="block mt-4 font-medium text-foreground">
              Validações e consequências:
            </span>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>
                <strong>Validação prévia:</strong> Você não pode deletar seu
                próprio perfil de acesso
              </li>
              <li>
                Todas as permissões associadas a este perfil serão excluídas
                automaticamente
              </li>
              <li>
                Todos os usuários atribuídos a este perfil terão seus perfis
                removidos
              </li>
              <li>
                Os usuários afetados perderão acesso imediato às funcionalidades
              </li>
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
          <span>Deletar Perfil</span>

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

const DeleteProfileAccessForm = ({
  profileAccessId,
}: DeleteProfileAccessProps): JSX.Element => {
  const [state, dispatch] = useFormState(
    () => handleDeleteProfileAccess(profileAccessId),
    null,
  );

  const { isOpenDeleteProfileAccessForm, handleDeleteProfileAccessForm } =
    useDeleteProfileAccessForm(state);

  return (
    <AlertDialog
      open={isOpenDeleteProfileAccessForm}
      onOpenChange={handleDeleteProfileAccessForm}
    >
      <AlertDialogTrigger asChild>
        <Button
          onClick={handleDeleteProfileAccessForm}
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
          <DeleteProfileAccessFormContainer />
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export { DeleteProfileAccessForm };
