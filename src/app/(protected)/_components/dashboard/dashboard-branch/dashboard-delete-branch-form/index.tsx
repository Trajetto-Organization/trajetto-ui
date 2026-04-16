import { useState } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Loader, ShieldAlert, Trash } from "lucide-react";

import { handleDeleteBranch } from "@/actions/branch/delete-branch";
import { useDashboardDeleteBranchForm } from "./hooks";

import { useHasPermission } from "@/lib/user-has-permission";
import { permissions } from "@/lib/permissions";

interface DashboardDeleteBranchProps {
  businessId: string;
  branchId: string;
  branchName: string;
}

const DashboardDeleteBranchFormSubmit = ({
  branchName,
  confirmationText,
  setConfirmationText,
}: {
  branchName: string;
  confirmationText: string;
  setConfirmationText: (value: string) => void;
}): JSX.Element => {
  const { pending } = useFormStatus();
  const isConfirmed = confirmationText === branchName;

  const deleteBranchList = [
    {
      data: `<strong>Validação prévia:</strong> A exclusão falhará se houver veículos associados a esta filial`,
    },
    {
      data: `<strong>Validação prévia:</strong> A exclusão falhará se houver motoristas associados a esta filial`,
    },
    {
      data: `<strong>Validação prévia:</strong> A exclusão falhará se houver ordens de serviço associadas a esta filial`,
    },
    {
      data: `<strong>Validação prévia:</strong> A exclusão falhará se houver combustíveis associados a esta filial`,
    },
    {
      data: `<strong>Validação prévia:</strong> A exclusão falhará se houver checklist veiculares associados a esta filial`,
    },
    {
      data: `<strong>Validação prévia:</strong> A exclusão falhará se houver registros finaceiros (contas a pagar) associadas a esta filial`,
    },
    {
      data: `<strong>Validação prévia:</strong> A exclusão falhará se houver multas associadas a esta filial`,
    },
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
        <AlertDialogTitle className="text-red-600 dark:text-red-500">
          Deletar Filial
        </AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div className="space-y-4">
            <p>
              Esta ação é{" "}
              <strong className="text-foreground">
                permanente e irreversível
              </strong>
              . A exclusão desta filial removerá todos os dados e configurações
              associadas.
            </p>

            <ScrollArea
              className="h-96 rounded-lg border border-red-200 p-4
              dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20"
            >
              <p className="font-medium text-foreground text-sm">
                Consequências imediatas:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                {deleteBranchList.map(({ data }, idx) => (
                  <li key={idx} dangerouslySetInnerHTML={{ __html: data }} />
                ))}
              </ul>
            </ScrollArea>

            <div className="space-y-2">
              <p className="text-sm text-foreground">
                Para confirmar, digite{" "}
                <strong className="font-mono text-red-600 dark:text-red-400 select-all">
                  {branchName}
                </strong>{" "}
                abaixo:
              </p>
              <Input
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder={branchName}
                className="font-mono text-sm border-red-200 dark:border-red-900/50
                focus-visible:ring-red-500/30"
                autoComplete="off"
              />
            </div>
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter className="mt-6 w-full">
        <AlertDialogCancel className="w-full">Cancelar</AlertDialogCancel>
        <Button
          type="submit"
          disabled={pending || !isConfirmed}
          variant={"secondary"}
          className="bg-red-600 hover:bg-red-700 text-white
          dark:bg-red-600 dark:hover:bg-red-700 dark:text-white
          disabled:opacity-40 disabled:cursor-not-allowed
          transition-all duration-200 w-full"
        >
          <ShieldAlert className="mr-1 size-5" />
          <span>Deletar permanentemente</span>

          {pending && (
            <div className="animate-spin ml-1">
              <Loader size={16} />
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
  branchName,
}: DashboardDeleteBranchProps): JSX.Element => {
  const [confirmationText, setConfirmationText] = useState<string>("");
  const [state, dispatch] = useFormState(
    () => handleDeleteBranch({ businessId, branchId }),
    null,
  );

  const { isOpenDeleteBranchForm, handleDeleteBranchForm } =
    useDashboardDeleteBranchForm(state);

  const handleOpenChange = () => {
    setConfirmationText("");
    handleDeleteBranchForm();
  };

  const hasUserPermission = useHasPermission(
    permissions.BRANCH_MANAGE,
    "write",
  );

  return (
    <AlertDialog open={isOpenDeleteBranchForm} onOpenChange={handleOpenChange}>
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
          <DashboardDeleteBranchFormSubmit
            branchName={branchName}
            confirmationText={confirmationText}
            setConfirmationText={setConfirmationText}
          />
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export { DashboardDeleteBranchForm };
