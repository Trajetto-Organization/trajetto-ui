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

import { useDeleteFineForm } from "./hooks";
import { handleDeleteFine } from "@/actions/fine/delete-fine";

interface DeleteFineProps {
  fineId: string;
}

const DeleteFineFormSubmit = (): JSX.Element => {
  const { pending } = useFormStatus();
  const deleteFineList = [
    { data: "Todos os dados da multa serão excluídos permanentemente" },
    { data: "As referências ao motorista e veículo permanecerão intactas" },
    {
      data: "Os registros de atividade relacionados à multa serão mantidos para auditoria",
    },
    {
      data: "As estatísticas de multas da empresa serão atualizadas",
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
        <AlertDialogTitle>Deletar Multa</AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div>
            A exclusão desta multa removerá permanentemente todos os seus dados
            e registros associados.
            <span className="block mt-4 font-medium text-foreground">
              Consequências imediatas:
            </span>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              {deleteFineList.map(({ data }, idx) => (
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
          <span>Deletar Multa</span>

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

const DeleteFineForm = ({ fineId }: DeleteFineProps): JSX.Element => {
  const [state, dispatch] = useFormState(
    () => handleDeleteFine({ fineId }),
    null,
  );

  const { handleDeleteFineForm, isOpenDeleteFineForm } =
    useDeleteFineForm(state);

  return (
    <AlertDialog
      open={isOpenDeleteFineForm}
      onOpenChange={handleDeleteFineForm}
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
          <DeleteFineFormSubmit />
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export { DeleteFineForm };
