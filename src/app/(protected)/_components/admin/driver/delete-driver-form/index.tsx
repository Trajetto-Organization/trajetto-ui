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

import { useDeleteDriverForm } from "./hooks";
import { handleDeleteDriver } from "@/actions/driver/delete-driver";

interface DeleteDriverProps {
  businessId: string;
  driverId: string;
}

const DeleteDriverFormSubmit = (): JSX.Element => {
  const { pending } = useFormStatus();
  const deleteDriverList = [
    {
      data: `<strong>Validação prévia:</strong> A exclusão falhará se houver multas associadas a este motorista`,
    },
    {
      data: `<strong>Validação prévia:</strong> A exclusão falhará se houver combustíveis associados a este motorista`,
    },
    {
      data: `<strong>Validação prévia:</strong> A exclusão falhará se houver checklists associados a este motorista`,
    },
    {
      data: "Qualquer veículo atribuído a este motorista perderá sua associação",
    },
    {
      data: "O histórico de atividades relacionado a este motorista será mantido",
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
        <AlertDialogTitle>Deletar Motorista</AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div>
            A exclusão deste motorista removerá permanentemente todos os seus
            dados e configurações associadas.
            <span className="block mt-4 font-medium text-foreground">
              Validações e consequências:
            </span>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              {deleteDriverList.map(({ data }, idx) => (
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
          <span>Deletar Motorista</span>

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

const DeleteDriverForm = ({
  businessId,
  driverId,
}: DeleteDriverProps): JSX.Element => {
  const [state, dispatch] = useFormState(
    () => handleDeleteDriver({ businessId, driverId }),
    null,
  );

  const { handleDeleteDriverForm, isOpenDeleteDriverForm } =
    useDeleteDriverForm(state);

  return (
    <AlertDialog
      open={isOpenDeleteDriverForm}
      onOpenChange={handleDeleteDriverForm}
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
      <AlertDialogContent className="bg-white dark:bg-[#121214]">
        <form action={dispatch}>
          <DeleteDriverFormSubmit />
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export { DeleteDriverForm };
