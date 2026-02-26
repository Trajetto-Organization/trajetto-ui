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

import { handleDeleteBranch } from "@/actions/branch/delete-branch";
import { useDashboardDeleteBranchForm } from "./hooks";

import { useHasPermission } from "@/lib/user-has-permission";
import { permissions } from "@/lib/permissions";

interface DashboardDeleteBranchProps {
  businessId: string;
  branchId: string;
}

const DashboardDeleteBranchFormSubmit = (): JSX.Element => {
  const { pending } = useFormStatus();
  const deleteBranchList = [
    {
      data: "Todos os veículos vinculados a esta filial serão excluídos",
    },
    {
      data: "Todos os motoristas associados a esta filial serão excluídos",
    },
    {
      data: "Todas as ordens de serviço registradas nesta filial serão excluídas",
    },
    {
      data: "Todos os combustíveis registrados nesta filial serão excluídos",
    },
    {
      data: "Todos os checklist veiculares registrados nesta filial serão excluídos",
    },
    {
      data: "Todos os registros financeiros (contas a pagar) da filial serão removidos",
    },
    {
      data: "Todas as multas registradas nesta filial serão excluídas",
    },
    {
      data: "Esta ação não pode ser desfeita",
    },
  ];

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Deletar Filial</AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div>
            A exclusão desta filial removerá permanentemente todos os seus dados
            e configurações associadas.
            <span className="block mt-4 font-medium text-foreground">
              Consequências imediatas:
            </span>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              {deleteBranchList.map(({ data }, idx) => (
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
          <span>Deletar Filial</span>

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

const DashboardDeleteBranchForm = ({
  businessId,
  branchId,
}: DashboardDeleteBranchProps): JSX.Element => {
  const [state, dispatch] = useFormState(
    () => handleDeleteBranch({ businessId, branchId }),
    null,
  );

  const { isOpenDeleteBusinessForm, handleDeleteBusinessForm } =
    useDashboardDeleteBranchForm(state);

  const hasUserPermission = useHasPermission(
    permissions.BRANCH_MANAGE,
    "write",
  );

  return (
    <AlertDialog
      open={isOpenDeleteBusinessForm}
      onOpenChange={handleDeleteBusinessForm}
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
          <DashboardDeleteBranchFormSubmit />
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export { DashboardDeleteBranchForm };
