"use client";

import { useFormState, useFormStatus } from "react-dom";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

import { handleDeleteKanbanColumn } from "@/actions/kanban/delete-kanban-column";
import { useDeleteColumnDialog } from "./hooks";

import type { DeleteColumnDialogProps } from "./delete-column-dialog.types";
import { Loader } from "lucide-react";

import { useHasPermission } from "@/lib/user-has-permission";
import { permissions } from "@/lib/permissions";

const DeleteColumnDialogForm = (): JSX.Element => {
  const { pending } = useFormStatus();

  const hasUserPermission = useHasPermission(
    permissions.KANBAN_MANAGE,
    "write",
  );

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Excluir Coluna</AlertDialogTitle>
        <AlertDialogDescription>
          Tem certeza que deseja excluir esta coluna? Esta ação não pode ser
          desfeita.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancelar</AlertDialogCancel>
        <Button
          type="submit"
          disabled={pending || !hasUserPermission}
          variant={"secondary"}
          className="bg-red-600/10 dark:bg-red-500/10 
          dark:text-red-500 text-red-600"
        >
          <span>Excluir</span>
          {pending && <Loader className="ml-2 h-4 w-4 animate-spin" />}
        </Button>
      </AlertDialogFooter>
    </>
  );
};

const DeleteColumnDialog = ({
  isOpen,
  onClose,
  column,
}: DeleteColumnDialogProps): JSX.Element => {
  const [state, dispatch] = useFormState(
    () =>
      handleDeleteKanbanColumn({
        businessId: column.businessId,
        columnId: column.id,
      }),
    null,
  );

  useDeleteColumnDialog({
    state,
    onClose,
    businessId: column.businessId,
  });

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <form action={dispatch}>
          <DeleteColumnDialogForm />
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export { DeleteColumnDialog };
