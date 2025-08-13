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

import { useDashboardDeleteFuelForm } from "./hooks";
import { handleDeleteFuel } from "@/actions/delete-fuel";

import { useHasPermission } from "@/lib/user-has-permission";
import { permissions } from "@/lib/permissions";

import { useAuthStore } from "@/store/auth-store";

interface DeleteFuelProps {
  fuelId: string;
}

const DashboardDeleteFuelFormContainer = (): JSX.Element => {
  const { pending } = useFormStatus();

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Deletar Abastecimento</AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div>
            A exclusão deste abastecimento removerá permanentemente todos os
            seus dados e informações associadas.
            <span className="block mt-4 font-medium text-foreground">
              Consequências imediatas:
            </span>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>
                Verifica se o abastecimento pertence à empresa antes de deletar
              </li>
              <li>
                Todos os dados do abastecimento (litros, valores, datas) serão
                excluídos permanentemente
              </li>
              <li>O histórico de abastecimentos do veículo será impactado</li>
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
          <span>Deletar Abastecimento</span>

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

const DashboardDeleteFuelForm = ({ fuelId }: DeleteFuelProps): JSX.Element => {
  const { businessId } = useAuthStore();
  const [state, dispatch] = useFormState(
    () =>
      handleDeleteFuel({
        businessId: businessId as string,
        fuelId,
      }),
    null,
  );

  const { handleDeleteFuelForm, isOpenDeleteFuelForm } =
    useDashboardDeleteFuelForm(state);

  const hasUserPermission = useHasPermission(permissions.FUEL_MANAGE, "write");

  return (
    <AlertDialog
      open={isOpenDeleteFuelForm}
      onOpenChange={handleDeleteFuelForm}
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
          <DashboardDeleteFuelFormContainer />
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export { DashboardDeleteFuelForm };
