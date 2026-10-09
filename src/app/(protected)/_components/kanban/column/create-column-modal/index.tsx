"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import {
  Dialog,
  DialogScrollContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFormFooter,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { FieldShell } from "@/components/shared/custom/field-shell";

import { Loader } from "lucide-react";

import FormInput from "@/components/shared/custom/form-input";

import { handleCreateKanbanColumn } from "@/actions/kanban/create-kanban-column";
import { useCreateColumnModal } from "./hooks";

import type {
  CreateColumnFormProps,
  CreateColumnModalFormState,
  CreateColumnModalProps,
} from "./create-column-modal.types";
import { Input } from "@/components/ui/input";

import { ColorSwatches } from "../color-swatches";

import { useHasPermission } from "@/lib/user-has-permission";
import { permissions } from "@/lib/permissions";
import { guardFormAction } from "@/lib/action-result";

const CreateColumnForm = ({
  onClose,
  state,
}: CreateColumnFormProps): JSX.Element => {
  const { pending } = useFormStatus();

  const hasUserPermission = useHasPermission(
    permissions.KANBAN_MANAGE,
    "write",
  );

  const [title, setTitle] = useState<string>("");
  const [color, setColor] = useState<string>("#64748b");

  return (
    <>
      <div className="space-y-4 mt-2">
        {/* Título */}
        <FormInput
          label="Nome da Coluna *"
          htmlfor="title"
          name="title"
          type="text"
          value={title}
          errorName={state.createColumnError?.title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Em Progresso"
          disabled={pending}
        />

        {/* Cor */}
        <FieldShell
          label="Cor da Coluna*"
          htmlFor="color"
          error={state.createColumnError?.color}
        >
          {(control) => (
            <>
              <ColorSwatches
                value={color}
                onChange={setColor}
                disabled={pending}
              />

              <Input
                {...control}
                type="color"
                name="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-full cursor-pointer rounded-md"
                disabled={pending}
              />
            </>
          )}
        </FieldShell>
      </div>

      {/* Cancelar first; the layout follows the dialog's width (decision 3.2). */}
      <DialogFormFooter className="mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={pending}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={pending || !title.trim() || !hasUserPermission}
        >
          Criar Coluna
          {pending && <Loader className="ml-2 h-4 w-4 animate-spin" />}
        </Button>
      </DialogFormFooter>
    </>
  );
};

const CreateColumnModal = ({
  isOpen,
  onClose,
  boardId,
}: CreateColumnModalProps): JSX.Element => {
  const defaultState: CreateColumnModalFormState = {};
  const [state, dispatch] = useFormState(
    guardFormAction(handleCreateKanbanColumn),
    null,
  );

  const { formRef } = useCreateColumnModal({
    state,
    onClose,
    businessId: boardId,
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogScrollContent>
        <DialogHeader>
          <DialogTitle>Nova Coluna</DialogTitle>
          <DialogDescription>
            Crie uma nova coluna para organizar seus cards
          </DialogDescription>
        </DialogHeader>

        <form
          ref={formRef}
          action={(formData) => {
            formData.append("businessId", boardId);
            dispatch(formData);
          }}
        >
          <CreateColumnForm state={state ?? defaultState} onClose={onClose} />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { CreateColumnModal };
