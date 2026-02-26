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

import { useDashboardDeleteServiceOrderForm } from "./hooks";
import { handleDeleteServiceOrder } from "@/actions/service-order/delete-service-order";

import { useHasPermission } from "@/lib/user-has-permission";
import { permissions } from "@/lib/permissions";

import { useAuthStore } from "@/store/auth-store";

interface DeleteServiceOrderProps {
  serviceOrderId: string;
}

const DashboardDeleteServiceOrderFormSubmit = (): JSX.Element => {
  const { pending } = useFormStatus();
  const deleteServiceOrdeList = [
    {
      data: "Todos os registros de peças associadas a esta ordem serão excluídos automaticamente",
    },
    {
      data: "Contas a pagar vinculadas a esta ordem de serviço serão excluídas automaticamente",
    },
    { data: "O histórico de manutenção do veículo será impactado" },
    { data: "Esta ação será registrada nos logs de atividade do sistema" },
    {
      data: "Esta ação não pode ser desfeita",
    },
  ];

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Deletar Ordem de Serviço</AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div>
            A exclusão desta ordem de serviço removerá permanentemente todos os
            seus dados e configurações associadas.
            <span className="block mt-4 font-medium text-foreground">
              Consequências imediatas:
            </span>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              {deleteServiceOrdeList.map(({ data }, idx) => (
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
          <span>Deletar Ordem de Serviço</span>

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

const DashboardDeleteServiceOrderForm = ({
  serviceOrderId,
}: DeleteServiceOrderProps): JSX.Element => {
  const { businessId } = useAuthStore();
  const [state, dispatch] = useFormState(
    () =>
      handleDeleteServiceOrder({
        businessId: businessId as string,
        serviceOrderId,
      }),
    null,
  );

  const { handleDeleteServiceOrderForm, isOpenDeleteServiceOrderForm } =
    useDashboardDeleteServiceOrderForm(state);

  const hasUserPermission = useHasPermission(
    permissions.SERVICE_ORDER_MANAGE,
    "write",
  );

  return (
    <AlertDialog
      open={isOpenDeleteServiceOrderForm}
      onOpenChange={handleDeleteServiceOrderForm}
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
          <DashboardDeleteServiceOrderFormSubmit />
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export { DashboardDeleteServiceOrderForm };
