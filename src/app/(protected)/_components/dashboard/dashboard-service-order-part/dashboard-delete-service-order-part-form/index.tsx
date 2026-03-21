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

import { handleDeleteServiceOrderPart } from "@/actions/service-order-part/delete-service-order-part";

import { useAuthStore } from "@/store/auth-store";
import { useHasPermission } from "@/lib/user-has-permission";

import { permissions } from "@/lib/permissions";
import { useDashboardDeleteServiceOrderPartForm } from "./hooks";

interface DashboardDeleteServiceOrderPartProps {
  serviceOrderPartId: string;
  serviceOrderId: string;
}

const DashboardDeleteServiceOrderPartFormSubmit = (): JSX.Element => {
  const { pending } = useFormStatus();
  const deleteServiceOrderPartList = [
    {
      data: "Verifique se a peça realmente pertence à ordem de serviço especificada",
    },
    {
      data: "O valor total da ordem de serviço será recalculado automaticamente",
    },
    {
      data: "O estoque da peça não será reajustado automaticamente",
    },
    {
      data: "O registro de utilização da peça será removido do histórico da ordem",
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
        <AlertDialogTitle>Deletar Ordem de Serviço Por Peça</AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div>
            A exclusão desta peça da ordem de serviço removerá permanentemente
            este registro específico.
            <span className="block mt-4 font-medium text-foreground">
              Validações e consequências:
            </span>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              {deleteServiceOrderPartList.map(({ data }, idx) => (
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
          <span>Deletar Ordem de Serviço Por Peça</span>

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

const DashboardDeleteServiceOrderPartForm = ({
  serviceOrderPartId,
  serviceOrderId,
}: DashboardDeleteServiceOrderPartProps): JSX.Element => {
  const { businessId } = useAuthStore();
  const [state, dispatch] = useFormState(
    () =>
      handleDeleteServiceOrderPart({
        businessId: businessId as string,
        serviceOrderPartId,
        serviceOrderId,
      }),
    null,
  );

  const { handleDeleteServiceOrderPartForm, isOpenDeleteServiceOrderPartForm } =
    useDashboardDeleteServiceOrderPartForm(state);

  const hasUserPermission = useHasPermission(
    permissions.SERVICE_ORDER_PART_MANAGE,
    "write",
  );

  return (
    <AlertDialog
      open={isOpenDeleteServiceOrderPartForm}
      onOpenChange={handleDeleteServiceOrderPartForm}
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
          <DashboardDeleteServiceOrderPartFormSubmit />
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export { DashboardDeleteServiceOrderPartForm };
