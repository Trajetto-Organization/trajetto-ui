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

import { handleDeletePart } from "@/actions/part/delete-part";
import { useDeletePartForm } from "./hooks";

interface DeletePartProps {
  businessId: string;
  partId: string;
}

const DeletePartFormSubmit = (): JSX.Element => {
  const { pending } = useFormStatus();
  const deletePartList = [
    {
      data: `<strong>Validação prévia:</strong> A exclusão falhará se houver ordens de serviço utilizando esta peça`,
    },
    {
      data: "Verifique se a peça pertence à empresa antes de deletar",
    },
    {
      data: "Todas as referências desta peça em ordens de serviço devem ser removidas primeiro",
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
        <AlertDialogTitle>Deletar Peça</AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div>
            A exclusão desta peça removerá permanentemente todos os seus dados e
            configurações associadas.
            <span className="block mt-4 font-medium text-foreground">
              Validações e consequências:
            </span>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              {deletePartList.map(({ data }, idx) => (
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
          <span>Deletar Peça</span>

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

const DeletePartForm = ({
  businessId,
  partId,
}: DeletePartProps): JSX.Element => {
  const [state, dispatch] = useFormState(
    () => handleDeletePart({ businessId, partId }),
    null,
  );

  const { isOpenDeletePartForm, handleDeletePartForm } =
    useDeletePartForm(state);

  return (
    <AlertDialog
      open={isOpenDeletePartForm}
      onOpenChange={handleDeletePartForm}
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
          <DeletePartFormSubmit />
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export { DeletePartForm };
