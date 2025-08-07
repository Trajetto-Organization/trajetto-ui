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

import { useDashboardDeleteVehicleForm } from "./hooks";
import { handleDeleteVehicle } from "@/actions/delete-vehicle";

import { permissions } from "@/lib/permissions";
import { useHasPermission } from "@/lib/user-has-permission";

import { useAuthStore } from "@/store/auth-store";

interface DashboardDeleteVehicleProps {
  vehicleId: string;
}

const DashboardDeleteVehicleFormContainer = (): JSX.Element => {
  const { pending } = useFormStatus();

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Deletar Veículo</AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div>
            A exclusão deste veículo removerá permanentemente todos os seus
            dados e configurações associadas.
            <span className="block mt-4 font-medium text-foreground">
              Validações e consequências:
            </span>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>
                <strong>Validação prévia:</strong> A exclusão falhará se houver
                multas associadas a este veículo
              </li>
              <li>
                <strong>Validação prévia:</strong> A exclusão falhará se houver
                ordens de serviço associadas a este veículo
              </li>
              <li>Verifica se o veículo pertence à empresa antes de deletar</li>
              <li>
                Caso passe nas validações, o veículo será excluído
                permanentemente
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
          <span>Deletar Veículo</span>

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

const DashboardDeleteVehicleForm = ({
  vehicleId,
}: DashboardDeleteVehicleProps): JSX.Element => {
  const { businessId } = useAuthStore();

  const [state, dispatch] = useFormState(
    () => handleDeleteVehicle({ businessId: businessId as string, vehicleId }),
    null,
  );

  const { handleDeleteVehicleForm, isOpenDeleteVehicleForm } =
    useDashboardDeleteVehicleForm(state);

  const hasUserPermission = useHasPermission(
    permissions.VEHICLE_MANAGE,
    "write",
  );

  return (
    <AlertDialog
      open={isOpenDeleteVehicleForm}
      onOpenChange={handleDeleteVehicleForm}
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
          <DashboardDeleteVehicleFormContainer />
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export { DashboardDeleteVehicleForm };
