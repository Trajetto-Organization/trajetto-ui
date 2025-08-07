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

import { useDashboardDeleteAccountPayableForm } from "./hooks";
import { handleDeleteAccountPayable } from "@/actions/delete-account-payable";

import { useAuthStore } from "@/store/auth-store";

import { useHasPermission } from "@/lib/user-has-permission";
import { permissions } from "@/lib/permissions";

interface DashboardDeleteAccountPayableProps {
  accountPayableId: string;
}

const DashboardDeleteAccountPayableFormContainer = (): JSX.Element => {
  const { pending } = useFormStatus();

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Deletar Conta a Pagar</AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div>
            A exclusão desta conta a pagar removerá permanentemente todos os
            seus dados e registros associados.
            <span className="block mt-4 font-medium text-foreground">
              Consequências imediatas:
            </span>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>
                <strong>Validação prévia:</strong> A exclusão falhará se a conta
                já foi paga
              </li>
              <li>Verifica se a conta pertence à empresa antes de deletar</li>
              <li>
                Todos os dados da conta a pagar serão excluídos permanentemente
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
          <span>Deletar conta a pagar</span>

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

const DashboardDeleteAccountPayableForm = ({
  accountPayableId,
}: DashboardDeleteAccountPayableProps): JSX.Element => {
  const { businessId } = useAuthStore();
  const [state, dispatch] = useFormState(
    () =>
      handleDeleteAccountPayable({
        businessId: businessId as string,
        accountPayableId,
      }),
    null,
  );

  const { handleDeleteAccountPayableForm, isOpenDeleteAccountPayableForm } =
    useDashboardDeleteAccountPayableForm(state);

  const hasUserPermission = useHasPermission(
    permissions.ACCOUNT_PAYABLE_MANAGE,
    "write",
  );

  return (
    <AlertDialog
      open={isOpenDeleteAccountPayableForm}
      onOpenChange={handleDeleteAccountPayableForm}
    >
      <AlertDialogTrigger asChild disabled={!hasUserPermission}>
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
          <DashboardDeleteAccountPayableFormContainer />
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export { DashboardDeleteAccountPayableForm };
