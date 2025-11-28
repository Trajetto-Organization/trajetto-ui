"use client";

import { useState, useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";

import {
  Dialog,
  DialogScrollContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import { Loader } from "lucide-react";
import FormInput from "@/components/custom/form-input";

import { handleUpdateKanbanColumn } from "@/actions/update-kanban-column";
import { useUpdateColumnDialog } from "./hooks";

import { Input } from "@/components/ui/input";
import {
  UpdateColumnDialogFormState,
  UpdateColumnDialogProps,
  UpdateColumnFormProps,
} from "./dto";

import { useHasPermission } from "@/lib/user-has-permission";
import { permissions } from "@/lib/permissions";

const UpdateColumnForm = ({
  column,
  onClose,
  state,
}: UpdateColumnFormProps): JSX.Element => {
  const { pending } = useFormStatus();
  const [isDirty, setIsDirty] = useState<boolean>(false);

  const [title, setTitle] = useState(column.title);
  const [color, setColor] = useState(column.color || "#64748b");

  const hasUserPermission = useHasPermission(
    permissions.KANBAN_MANAGE,
    "write",
  );

  const predefinedColors = [
    "#64748b", // Slate
    "#3b82f6", // Blue
    "#f59e0b", // Amber
    "#8b5cf6", // Violet
    "#22c55e", // Green
    "#ef4444", // Red
    "#ec4899", // Pink
    "#06b6d4", // Cyan
  ];

  // Function to check if any field has been changed
  const checkIfDirty = (newTitle: string, newColor: string) => {
    const hasChanges = [
      newTitle !== column.title,
      newColor !== (column.color || "#64748b"),
    ].some(Boolean);

    setIsDirty(hasChanges);
  };

  // Handlers that update state and check isDirty
  const handleTitleChange = (value: string) => {
    setTitle(value);
    checkIfDirty(value, color);
  };

  const handleColorChange = (value: string) => {
    setColor(value);
    checkIfDirty(title, value);
  };

  // Check initial isDirty when modal opens
  useEffect(() => {
    checkIfDirty(title, color);
  }, [column]);

  return (
    <>
      <div className="space-y-4 mt-2">
        <FormInput
          label="Nome da Coluna"
          htmlfor="title"
          name="title"
          type="text"
          value={title}
          errorName={state.updateColumnError?.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Ex: Em Progresso"
          disabled={pending}
        />

        <div className="space-y-2">
          <Label
            htmlFor="color"
            className={state.updateColumnError?.color ? "text-red-500" : ""}
          >
            {state.updateColumnError?.color
              ? state.updateColumnError?.color[0]
              : "Cor da Coluna"}
          </Label>
          <div className="flex gap-2">
            {predefinedColors.map((presetColor) => (
              <button
                key={presetColor}
                type="button"
                className="w-8 h-8 rounded-md border-2 transition-all"
                style={{
                  backgroundColor: presetColor,
                  borderColor: color === presetColor ? "#000" : "transparent",
                }}
                onClick={() => handleColorChange(presetColor)}
                disabled={pending}
              />
            ))}
          </div>
          <Input
            id="color"
            type="color"
            name="color"
            value={color}
            onChange={(e) => handleColorChange(e.target.value)}
            className="h-10 w-full cursor-pointer rounded-md"
            disabled={pending}
          />
        </div>
      </div>

      <DialogFooter className="mt-6 gap-1">
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
          disabled={pending || !title.trim() || !isDirty || !hasUserPermission}
        >
          Atualizar Coluna
          {pending && <Loader className="ml-2 h-4 w-4 animate-spin" />}
        </Button>
      </DialogFooter>
    </>
  );
};

const UpdateColumnDialog = ({
  isOpen,
  onClose,
  column,
}: UpdateColumnDialogProps): JSX.Element => {
  const defaultState: UpdateColumnDialogFormState = {};
  const [state, dispatch] = useFormState(handleUpdateKanbanColumn, null);

  const { formRef } = useUpdateColumnDialog({
    state,
    onClose,
    businessId: column.businessId,
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogScrollContent>
        <DialogHeader>
          <DialogTitle>Editar Coluna</DialogTitle>
          <DialogDescription>
            Atualize as informações da coluna
          </DialogDescription>
        </DialogHeader>

        <form
          ref={formRef}
          action={(formData) => {
            formData.append("businessId", column.businessId);
            formData.append("columnId", column.id);

            dispatch(formData);
          }}
        >
          <UpdateColumnForm
            state={state ?? defaultState}
            column={column}
            onClose={onClose}
          />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { UpdateColumnDialog };
