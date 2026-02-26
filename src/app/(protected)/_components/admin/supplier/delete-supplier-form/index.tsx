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

import { handleDeleteSupplier } from "@/actions/supplier/delete-supplier";
import { useDeleteSupplierForm } from "./hooks";

interface DeleteSupplierProps {
  businessId: string;
  supplierId: string;
}

const DeleteSupplierFormSubmit = (): JSX.Element => {
  const { pending } = useFormStatus();
  const deleteSupplierList = [
    {
      data: "Verifique se o fornecedor pertence à empresa antes de deletar",
    },
    {
      data: "Peças associadas a este fornecedor terão sua vinculação removida",
    },
    {
      data: "Ordens de serviço associadas a este fornecedor terão sua vinculação removida",
    },
    {
      data: "Manutenções externas registradas com este fornecedor serão afetadas",
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
        <AlertDialogTitle>Deletar Fornecedor</AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div>
            A exclusão deste fornecedor removerá permanentemente todos os seus
            dados e configurações associadas.
            <span className="block mt-4 font-medium text-foreground">
              Consequências imediatas:
            </span>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              {deleteSupplierList.map(({ data }, idx) => (
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
          <span>Deletar Fornecedor</span>

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

const DeleteSupplierForm = ({
  businessId,
  supplierId,
}: DeleteSupplierProps): JSX.Element => {
  const [state, dispatch] = useFormState(
    () => handleDeleteSupplier({ businessId, supplierId }),
    null,
  );

  const { isOpenDeleteSupplierForm, handleDeleteSupplierForm } =
    useDeleteSupplierForm(state);

  return (
    <AlertDialog
      open={isOpenDeleteSupplierForm}
      onOpenChange={handleDeleteSupplierForm}
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
          <DeleteSupplierFormSubmit />
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export { DeleteSupplierForm };
