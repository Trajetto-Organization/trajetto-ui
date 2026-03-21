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

import { Loader, ShieldAlert, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";

import { handleDeleteFuelType } from "@/actions/fuel-type/delete-fuel-type";
import { useDeleteFuelTypeForm } from "./hooks";

interface DeleteFuelTypeProps {
  businessId: string;
  fuelTypeId: string;
}

const DeleteFuelTypeFormSubmit = (): JSX.Element => {
  const { pending } = useFormStatus();
  const deleteFuelTypeList = [
    {
      data: `<strong>Validação prévia:</strong> A exclusão falhará se houver veículos utilizando este tipo de combustível`,
    },
    {
      data: `<strong>Validação prévia:</strong> A exclusão falhará se houver abastecimentos associados a este tipo de combustível`,
    },
    {
      data: "Verifique se o tipo de combustível pertence à empresa antes de deletar",
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
        <AlertDialogTitle>Deletar Tipo do Combustível</AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div>
            A exclusão deste tipo de combustível removerá permanentemente todos
            os seus dados e configurações associadas.
            <span className="block mt-4 font-medium text-foreground">
              Validações e consequências:
            </span>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              {deleteFuelTypeList.map(({ data }, idx) => (
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
          <span>Deletar Tipo do Combustível</span>

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

const DeleteFuelTypeForm = ({
  businessId,
  fuelTypeId,
}: DeleteFuelTypeProps): JSX.Element => {
  const [state, dispatch] = useFormState(
    () => handleDeleteFuelType({ businessId, fuelTypeId }),
    null,
  );

  const { isOpenDeleteFuelTypeForm, handleDeleteFuelTypeForm } =
    useDeleteFuelTypeForm(state);

  return (
    <AlertDialog
      open={isOpenDeleteFuelTypeForm}
      onOpenChange={handleDeleteFuelTypeForm}
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
          <DeleteFuelTypeFormSubmit />
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export { DeleteFuelTypeForm };
