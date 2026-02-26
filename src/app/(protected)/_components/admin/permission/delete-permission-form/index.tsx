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

import { handleDeletePermission } from "@/actions/permission/delete-permission";
import { useDeletePermissionForm } from "./hooks";

interface DeletePermissionProps {
  permissionId: string;
}

const DeletePermissionFormSubmit = (): JSX.Element => {
  const { pending } = useFormStatus();
  const deletePermissionList = [
    {
      data: `<strong>Validação prévia:</strong> Você não pode deletar suas próprias permissões`,
    },
    {
      data: "Usuários com esta permissão perderão acesso às funcionalidades relacionadas",
    },
    {
      data: "Perfis de acesso que contêm esta permissão serão modificados automaticamente",
    },
    {
      data: "Esta alteração afetará todos os usuários associados aos perfis modificados",
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
        <AlertDialogTitle>Deletar Permissão</AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div>
            A exclusão desta permissão removerá permanentemente todos os seus
            dados e configurações associadas.
            <span className="block mt-4 font-medium text-foreground">
              Validações e consequências:
            </span>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              {deletePermissionList.map(({ data }, idx) => (
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

const DeletePermissionForm = ({
  permissionId,
}: DeletePermissionProps): JSX.Element => {
  const [state, dispatch] = useFormState(
    () => handleDeletePermission(permissionId),
    null,
  );

  const { isOpenDeletePermissionForm, handleDeletePermissionForm } =
    useDeletePermissionForm(state);

  return (
    <AlertDialog
      open={isOpenDeletePermissionForm}
      onOpenChange={handleDeletePermissionForm}
    >
      <AlertDialogTrigger asChild>
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
          <DeletePermissionFormSubmit />
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export { DeletePermissionForm };
