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

import { useDeleteFuelForm } from "./hooks";
import { handleDeleteFuel } from "@/actions/delete-fuel";

interface DeleteFuelProps {
  businessId: string;
  fuelId: string;
}

const DeleteFuelFormSubmit = (): JSX.Element => {
  const { pending } = useFormStatus();

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Deletar Abastecimento</AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div>
            A exclusão deste abastecimento removerá permanentemente todos os
            seus dados e informações associadas.
            <span className="block mt-4 font-medium text-foreground">
              Consequências imediatas:
            </span>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>
                Verifica se o abastecimento pertence à empresa antes de deletar
              </li>
              <li>
                Todos os dados do abastecimento (litros, valores, datas) serão
                excluídos permanentemente
              </li>
              <li>O histórico de abastecimentos do veículo será impactado</li>
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
          <span>Deletar Abastecimento</span>

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

const DeleteFuelForm = ({
  businessId,
  fuelId,
}: DeleteFuelProps): JSX.Element => {
  const [state, dispatch] = useFormState(
    () => handleDeleteFuel({ businessId, fuelId }),
    null,
  );

  const { handleDeleteFuelForm, isOpenDeleteFuelForm } =
    useDeleteFuelForm(state);

  return (
    <AlertDialog
      open={isOpenDeleteFuelForm}
      onOpenChange={handleDeleteFuelForm}
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
          <DeleteFuelFormSubmit />
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export { DeleteFuelForm };
