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

import { useDeleteMasterUserForm } from "./hooks";
import { handleDeleteMasterUser } from "@/actions/user/delete-master-user";

interface DeleteMasterUserProps {
  masterUserId: string;
}

const DeleteMasterUserFormSubmit = (): JSX.Element => {
  const { pending } = useFormStatus();
  const deleteMasterUserList = [
    {
      data: `<strong>Validação prévia:</strong> Não é possível deletar o último usuário Master do sistema`,
    },
    {
      data: `<strong>Validação prévia:</strong> Você não pode deletar sua própria conta`,
    },
    {
      data: "Todas as sessões e tokens de acesso deste usuário serão invalidados automaticamente",
    },
    {
      data: "Notificações para este usuário serão excluídas automaticamente",
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
        <AlertDialogTitle>Deletar Usuário Master</AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div>
            A exclusão deste usuário Master removerá permanentemente a conta
            associada
            <span className="block mt-4 font-medium text-foreground">
              Validações e consequências:
            </span>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              {deleteMasterUserList.map(({ data }, idx) => (
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
          className="bg-red-600/10 dark:bg-red-500/10 dark:text-red-500 text-red-600"
        >
          <ShieldAlert className="mr-1 size-5" />
          <span>Deletar Usuário Master</span>

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

const DeleteMasterUserForm = ({
  masterUserId,
}: DeleteMasterUserProps): JSX.Element => {
  const [state, dispatch] = useFormState(
    () => handleDeleteMasterUser(masterUserId),
    null,
  );

  const { isOpenDeleteMasterUserForm, handleDeleteMasterUserForm } =
    useDeleteMasterUserForm(state);

  return (
    <AlertDialog
      open={isOpenDeleteMasterUserForm}
      onOpenChange={handleDeleteMasterUserForm}
    >
      <AlertDialogTrigger asChild>
        <Button
          onClick={handleDeleteMasterUserForm}
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
          <DeleteMasterUserFormSubmit />
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export { DeleteMasterUserForm };
