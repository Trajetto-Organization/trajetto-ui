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

import { useDashboardDeleteVehicleTypeForm } from "./hooks";
import { handleDeleteVehicleType } from "@/actions/vehicle-type/delete-vehicle-type";

import { useHasPermission } from "@/lib/user-has-permission";
import { useAuthStore } from "@/store/auth-store";

import { permissions } from "@/lib/permissions";

interface DashboardDeleteVehicleTypeProps {
  vehicleTypeId: string;
}

const DeleteVehicleTypeFormSubmit = (): JSX.Element => {
  const { pending } = useFormStatus();
  const deleteVehicleTypeList = [
    {
      data: "Veículos deste tipo terão sua associação removida",
    },
    {
      data: "Relatórios e filtros baseados neste tipo de veículo serão afetados",
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
        <AlertDialogTitle>Deletar Tipo do Veículo</AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div>
            A exclusão deste tipo de veículo removerá permanentemente todos os
            seus dados e configurações associadas.
            <span className="block mt-4 font-medium text-foreground">
              Consequências imediatas:
            </span>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              {deleteVehicleTypeList.map(({ data }, idx) => (
                <li key={idx} dangerouslySetInnerHTML={{ __html: data }} />
              ))}
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
          <span>Deletar Tipo do Veículo</span>

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

const DashboardDeleteVehicleTypeForm = ({
  vehicleTypeId,
}: DashboardDeleteVehicleTypeProps): JSX.Element => {
  const { businessId } = useAuthStore();

  const [state, dispatch] = useFormState(
    () =>
      handleDeleteVehicleType({
        businessId: businessId as string,
        vehicleTypeId,
      }),
    null,
  );

  const { isOpenDeleteVehicleTypeForm, handleDeleteVehicleTypeForm } =
    useDashboardDeleteVehicleTypeForm(state);

  const hasUserPermission = useHasPermission(
    permissions.VEHICLE_TYPE_MANAGE,
    "write",
  );

  return (
    <AlertDialog
      open={isOpenDeleteVehicleTypeForm}
      onOpenChange={handleDeleteVehicleTypeForm}
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
          <DeleteVehicleTypeFormSubmit />
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export { DashboardDeleteVehicleTypeForm };
