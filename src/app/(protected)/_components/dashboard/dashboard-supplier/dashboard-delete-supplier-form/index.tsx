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

import { handleDeleteSupplier } from "@/actions/delete-supplier";
import { useDashboardDeleteSupplierForm } from "./hooks";

import { useHasPermission } from "@/lib/user-has-permission";

import { permissions } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth-store";

interface DashboardDeleteSupplierProps {
  supplierId: string;
}

const DashboardDeleteSupplierFormContainer = (): JSX.Element => {
  const { pending } = useFormStatus();

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Deletar Fornecedor</AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div>
            A exclusão deste fornecedor removerá permanentemente todos os seus
            dados e configurações associadas.
            <span className="block mt-4 font-medium text-foreground">
              Consequências imediatas:
            </span>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>
                Verifica se o fornecedor pertence à empresa antes de deletar
              </li>
              <li>
                Peças associadas a este fornecedor terão sua vinculação removida
              </li>
              <li>
                Ordens de serviço associadas a este fornecedor terão sua
                vinculação removida
              </li>
              <li>
                Manutenções externas registradas com este fornecedor serão
                afetadas
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
          <span>Deletar Fornecedor</span>

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

const DashboardDeleteSupplierForm = ({
  supplierId,
}: DashboardDeleteSupplierProps): JSX.Element => {
  const { businessId } = useAuthStore();

  const [state, dispatch] = useFormState(
    () =>
      handleDeleteSupplier({ businessId: businessId as string, supplierId }),
    null,
  );

  const { isOpenDeleteSupplierForm, handleDeleteSupplierForm } =
    useDashboardDeleteSupplierForm(state);

  const hasUserPermission = useHasPermission(
    permissions.SUPPLIER_MANAGE,
    "write",
  );

  return (
    <AlertDialog
      open={isOpenDeleteSupplierForm}
      onOpenChange={handleDeleteSupplierForm}
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
          <DashboardDeleteSupplierFormContainer />
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export { DashboardDeleteSupplierForm };
