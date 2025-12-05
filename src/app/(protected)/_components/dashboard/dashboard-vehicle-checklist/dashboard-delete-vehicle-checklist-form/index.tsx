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

import { useDashboardDeleteVehicleChecklistForm } from "./hooks";
import { handleDeleteVehicleChecklist } from "@/actions/delete-vehicle-checklist";

import { useAuthStore } from "@/store/auth-store";
import { useHasPermission } from "@/lib/user-has-permission";

import { permissions } from "@/lib/permissions";

interface DashboardDeleteVehicleChecklistProps {
  checklistId: string;
}

const DashboardDeleteVehicleChecklistFormContainer = (): JSX.Element => {
  const { pending } = useFormStatus();

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Deletar Checklist Veicular</AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div>
            A exclusão deste checklist veicular removerá permanentemente todos
            os seus dados e informações associadas.
            <span className="block mt-4 font-medium text-foreground">
              Consequências imediatas:
            </span>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>
                Verifica se o checklist pertence à empresa antes de deletar
              </li>
              <li>
                Todos os dados do checklist (condições, inspeções, fotos) serão
                excluídos permanentemente
              </li>
              <li>O histórico de inspeções do veículo será impactado</li>
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
          <span>Deletar Checklist</span>

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

const DashboardDeleteVehicleChecklistForm = ({
  checklistId,
}: DashboardDeleteVehicleChecklistProps): JSX.Element => {
  const { businessId } = useAuthStore();
  const [state, dispatch] = useFormState(
    () =>
      handleDeleteVehicleChecklist({
        businessId: businessId as string,
        checklistId,
      }),
    null,
  );

  const { handleDeleteVehicleChecklistForm, isOpenDeleteVehicleChecklistForm } =
    useDashboardDeleteVehicleChecklistForm(state);

  const hasUserPermission = useHasPermission(
    permissions.VEHICLE_CHECKLIST_MANAGE,
    "write",
  );

  return (
    <AlertDialog
      open={isOpenDeleteVehicleChecklistForm}
      onOpenChange={handleDeleteVehicleChecklistForm}
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
          <DashboardDeleteVehicleChecklistFormContainer />
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export { DashboardDeleteVehicleChecklistForm };
