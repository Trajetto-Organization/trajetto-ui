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

import { useDashboardDeleteUserForm } from "./hooks";
import { handleDeleteUserRegistration } from "@/actions/user/delete-user-registration";

import { useHasPermission } from "@/lib/user-has-permission";
import { permissions } from "@/lib/permissions";

interface DashboardDeleteUserProps {
  userId: string;
}

const DashboardDeleteUserFormSubmit = (): JSX.Element => {
  const { pending } = useFormStatus();
  const deleteUserList = [
    {
      data: `<strong>Validação prévia:</strong> Você não pode deletar sua própria conta`,
    },
    {
      data: `<strong>Validação prévia:</strong> A exclusão falhará se houver ordens de serviço onde este usuário é responsável`,
    },
    {
      data: `<strong>Validação prévia:</strong> A exclusão falhará se houver contas a pagar registradas por este usuário`,
    },
    {
      data: "Todas as sessões e tokens de acesso deste usuário serão invalidados automaticamente",
    },
    {
      data: "Notificações para este usuário serão excluídas automaticamente",
    },
    {
      data: "Cartões Kanban atribuídos a este usuário serão desvinculados automaticamente",
    },
    {
      data: "Confirmações de dois fatores serão excluídas automaticamente",
    },
    {
      data: "O usuário perderá acesso total à plataforma",
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
        <AlertDialogTitle>Deletar Usuário</AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div>
            A exclusão deste usuário removerá permanentemente a conta associada
            <span className="block mt-4 font-medium text-foreground">
              Validações e consequências:
            </span>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              {deleteUserList.map(({ data }, idx) => (
                <li key={idx} dangerouslySetInnerHTML={{ __html: data }} />
              ))}
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
          className="bg-red-600/10 dark:bg-red-500/10 
          dark:text-red-500 text-red-600"
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

const DashboardDeleteUserForm = ({
  userId,
}: DashboardDeleteUserProps): JSX.Element => {
  const [state, dispatch] = useFormState(
    () => handleDeleteUserRegistration(userId),
    null,
  );

  const { isOpenDeleteUserForm, handleDeleteUserForm } =
    useDashboardDeleteUserForm(state);

  const hasUserPermission = useHasPermission(
    permissions.USER_REGISTRATION_MANAGE,
    "write",
  );

  return (
    <AlertDialog
      open={isOpenDeleteUserForm}
      onOpenChange={handleDeleteUserForm}
    >
      <AlertDialogTrigger asChild disabled={!hasUserPermission}>
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
          <DashboardDeleteUserFormSubmit />
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export { DashboardDeleteUserForm };
