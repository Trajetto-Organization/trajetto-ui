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

import { handleDeletePermission } from "@/actions/delete-permission";
import { useDashboardDeletePermissionForm } from "./hooks";

import { useHasPermission } from "@/lib/user-has-permission";
import { permissions } from "@/lib/permissions";

interface DeletePermissionProps {
  permissionId: string;
}

const DashboardDeletePermissionFormContainer = (): JSX.Element => {
  const { pending } = useFormStatus();

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Deletar Permissão</AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div>
            A exclusão desta permissão removerá permanentemente todos os seus
            dados e configurações associadas.
            <span className="block mt-4 font-medium text-foreground">
              Validações e consequências:
            </span>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>
                <strong>Validação prévia:</strong> Você não pode deletar suas
                próprias permissões
              </li>
              <li>
                Usuários com esta permissão perderão acesso às funcionalidades
                relacionadas
              </li>
              <li>
                Perfis de acesso que contêm esta permissão serão modificados
                automaticamente
              </li>
              <li>
                Esta alteração afetará todos os usuários associados aos perfis
                modificados
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
          <span>Deletar Permissão</span>

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

const DashboardDeletePermissionForm = ({
  permissionId,
}: DeletePermissionProps): JSX.Element => {
  const [state, dispatch] = useFormState(
    () => handleDeletePermission(permissionId),
    null,
  );

  const { isOpenDeletePermissionForm, handleDeletePermissionForm } =
    useDashboardDeletePermissionForm(state);

  const hasUserPermission = useHasPermission(
    permissions.USER_PERMISSION_MANAGE,
    "write",
  );

  return (
    <AlertDialog
      open={isOpenDeletePermissionForm}
      onOpenChange={handleDeletePermissionForm}
    >
      <AlertDialogTrigger asChild disabled={!hasUserPermission}>
        <Button
          onClick={handleDeletePermissionForm}
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
          <DashboardDeletePermissionFormContainer />
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export { DashboardDeletePermissionForm };
