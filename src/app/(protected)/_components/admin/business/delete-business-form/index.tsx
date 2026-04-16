"use client";

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

import { handleDeleteBusiness } from "@/actions/business/delete-business";
import { useDeleteBusinessForm } from "./hooks";

interface DeleteBusinessProps {
  bussinessId: string;
  businessName: string;
}

const DeleteBusinessFormSubmit = ({
  businessName,
  confirmationText,
  setConfirmationText,
}: {
  businessName: string;
  confirmationText: string;
  setConfirmationText: (value: string) => void;
}): JSX.Element => {
  const { pending } = useFormStatus();
  const isConfirmed = confirmationText === businessName;

  const deleteBusinessList = [
    {
      data: `<strong>Validação prévia:</strong> A exclusão falhará se houver filiais associadas a esta empresa`,
    },
    {
      data: `<strong>Validação prévia:</strong> A exclusão falhará se houver usuários associados a esta empresa`,
    },
    {
      data: `<strong>Validação prévia:</strong> A exclusão falhará se houver motoristas associados a esta empresa`,
    },
    {
      data: "Todas as filiais vinculadas a esta empresa serão excluídas permanentemente",
    },
    {
      data: "Todos os usuários associados a esta empresa perderão acesso ao sistema",
    },
    {
      data: "Todos os perfis de acesso e permissões desta empresa serão removidos",
    },
    {
      data: "Todos os veículos, motoristas, peças e tipos de combustível serão excluídos",
    },
    {
      data: "Todas as ordens de serviço e registros financeiros serão excluídos",
    },
    {
      data: "Todas as atividades, notificações e colunas kanban serão removidas",
    },
    {
      data: "Todas as multas registradas na empresa serão excluídas",
    },
    {
      data: "Esta ação não pode ser desfeita",
    },
  ];

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle className="text-red-600 dark:text-red-500">
          Deletar Empresa
        </AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div className="space-y-4">
            <p>
              Esta ação é{" "}
              <strong className="text-foreground">
                permanente e irreversível
              </strong>
              . A exclusão desta empresa removerá todos os dados e configurações
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
                {deleteBusinessList.map(({ data }, idx) => (
                  <li key={idx} dangerouslySetInnerHTML={{ __html: data }} />
                ))}
              </ul>
            </ScrollArea>

            <div className="space-y-2">
              <p className="text-sm text-foreground">
                Para confirmar, digite{" "}
                <strong
                  className="font-mono text-red-600 
                  dark:text-red-400 select-all"
                >
                  {businessName}
                </strong>{" "}
                abaixo:
              </p>
              <Input
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder={businessName}
                className="font-mono text-sm border-red-200 
                dark:border-red-900/50 focus-visible:ring-red-500/30"
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

const DeleteBusinessForm = ({
  bussinessId,
  businessName,
}: DeleteBusinessProps): JSX.Element => {
  const [confirmationText, setConfirmationText] = useState<string>("");
  const [state, dispatch] = useFormState(
    () => handleDeleteBusiness(bussinessId),
    null,
  );

  const { isOpenDeleteBusinessForm, handleDeleteBusinessForm } =
    useDeleteBusinessForm(state);

  const handleOpenChange = () => {
    setConfirmationText("");
    handleDeleteBusinessForm();
  };

  return (
    <AlertDialog
      open={isOpenDeleteBusinessForm}
      onOpenChange={handleOpenChange}
    >
      <AlertDialogTrigger asChild>
        <Button
          className="w-full text-sm rounded-sm px-2
          h-8 font-normal flex justify-between"
          variant={"ghost"}
        >
          Deletar
          <Trash size={17} className="dark:text-red-500 text-red-600" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-white dark:bg-[#121214] ">
        <form action={dispatch}>
          <DeleteBusinessFormSubmit
            businessName={businessName}
            confirmationText={confirmationText}
            setConfirmationText={setConfirmationText}
          />
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export { DeleteBusinessForm };
