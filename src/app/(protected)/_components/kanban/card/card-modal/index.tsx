"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import {
  Dialog,
  DialogScrollContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

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
import { Label } from "@/components/ui/label";
import { FieldShell } from "@/components/shared/custom/field-shell";

import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

import { Loader, ShieldAlert, Trash2, CheckCircle2, Copy } from "lucide-react";
import FormInput from "@/components/shared/custom/form-input";

import { cn } from "@/lib/utils";

import { handleCreateKanbanCard } from "@/actions/kanban/create-kanban-card";
import { handleUpdateKanbanCard } from "@/actions/kanban/update-kanban-card";

import { handleDeleteKanbanCard } from "@/actions/kanban/delete-kanban-card";
import type {
  CardModalFormProps,
  CardModalFormState,
  CardModalProps,
  PriorityProps,
} from "./card-modal.types";

import { useCardModal } from "./hooks";
import { UserSelector } from "../../user-selector";

import { toast } from "sonner";

import { useKanbanQueryClient } from "../../hooks/query-client";
import { useHasPermission } from "@/lib/user-has-permission";

import { permissions } from "@/lib/permissions";
import { useCardModalForm } from "./hooks/card-modal-form";

import { DatePickerField } from "@/app/(protected)/_components/shared/custom/date-picker-field";
import { SelectField } from "@/app/(protected)/_components/shared/custom/select-field";

const CardModalForm = ({
  card,
  businessId,
  onDelete,
  onClose,
  state,
  isEditing,
  isDeletingCard,
}: CardModalFormProps) => {
  const { pending } = useFormStatus();
  const hasUserPermission = useHasPermission(
    permissions.KANBAN_MANAGE,
    "write",
  );

  const {
    errorState,
    handleAssignedUserChange,
    handleCompletedChange,
    handleDescriptionChange,
    handleDueDateChange,
    handlePriorityChange,
    handleTitleChange,
    isDirty,
    setShowDeleteDialog,
    showDeleteDialog,
    assignedUserId,
    completed,
    description,
    dueDate,
    priority,
    title,
  } = useCardModalForm({ state, card, isEditing });

  return (
    <>
      <div className="space-y-4 mt-2">
        <div
          className="flex items-center justify-between
          p-4 bg-muted/30 rounded-lg border"
        >
          <div className="flex items-center space-x-3">
            <CheckCircle2
              className={cn(
                "h-5 w-5 transition-colors",
                completed ? "text-green-600" : "text-muted-foreground",
              )}
            />
            <div>
              <Label htmlFor="completed" className="text-sm font-medium">
                Status da Tarefa
              </Label>
              <p className="text-xs text-muted-foreground">
                {completed ? "Tarefa concluída" : "Tarefa em andamento"}
              </p>
            </div>
          </div>
          <Checkbox
            id="completed"
            name="completed-checkbox"
            checked={completed}
            onCheckedChange={handleCompletedChange}
            disabled={pending || !hasUserPermission}
            className="h-5 w-5"
          />
        </div>

        {/* Title */}
        <FormInput
          label="Título *"
          htmlfor="title"
          name="title"
          type="text"
          value={title}
          errorName={errorState?.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Ex: Ordem de serviço do veículo..."
          disabled={pending || !hasUserPermission}
        />

        {/* Description */}
        <FieldShell
          label="Descrição*"
          htmlFor="description"
          error={errorState?.description}
        >
          {(control) => (
            <Textarea
              {...control}
              name="description"
              value={description}
              onChange={(e) =>
                hasUserPermission
                  ? handleDescriptionChange(e.target.value)
                  : null
              }
              placeholder="Descreva em detalhes a tarefa..."
              className={cn(
                "resize-none min-h-[100px]",
                control["aria-invalid"] &&
                  "border-red-600 dark:border-red-500",
              )}
              disabled={pending}
            />
          )}
        </FieldShell>

        {/* Priority */}
        <SelectField
          label="Prioridade *"
          htmlfor="priority"
          name="priority"
          value={priority}
          onChange={(value) => handlePriorityChange(value as PriorityProps)}
          errorName={errorState?.priority}
          disabled={pending || !hasUserPermission}
          placeholder="Selecione a prioridade"
          options={[
            { value: "low", label: "Baixa" },
            { value: "medium", label: "Média" },
            { value: "high", label: "Alta" },
            { value: "urgent", label: "Urgente" },
          ]}
        />

        {/* Expiration Date */}
        <DatePickerField
          label="Data de Vencimento *"
          htmlfor="dueDate"
          name="dueDate"
          value={dueDate}
          onChange={handleDueDateChange}
          errorName={errorState?.dueDate}
          disabled={pending || !hasUserPermission}
          allowFutureDates={true}
        />

        {hasUserPermission && (
          <UserSelector
            businessId={businessId}
            value={assignedUserId}
            onValueChange={handleAssignedUserChange}
            disabled={pending}
            errorMessage={errorState?.assignedUserId}
          />
        )}

        {/* ✅ Hidden input para o completed */}
        <input
          id="completed-hidden"
          type="hidden"
          name="completed"
          value={completed.toString()}
        />
      </div>

      {hasUserPermission && (
        <>
          {/* Danger zone - visually separated */}
          {isEditing && (
            <div
              className="border-t border-red-200 
            dark:border-red-800 pt-4 mt-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Trash2 className="h-4 w-4 text-red-500 mr-2" />
                  <span className="text-sm text-red-500 font-medium">
                    Zona de perigo
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={pending || !hasUserPermission}
                  className="text-red-500 hover:text-red-600 
                hover:bg-red-50 dark:hover:bg-red-950/20"
                >
                  Excluir card
                </Button>
              </div>
            </div>
          )}
          {/* AlertDialog to confirm deletion */}
          <AlertDialog
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Deletar Card</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div>
                    A exclusão deste card removerá permanentemente todos os seus
                    dados e configurações associadas.
                    <span className="block mt-4 font-medium text-foreground">
                      Consequências imediatas:
                    </span>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                      <li>
                        O card será removido completamente da sua coluna atual
                      </li>
                      <li>
                        Todas as informações contidas neste card serão perdidas
                      </li>
                      <li>Esta ação não pode ser desfeita</li>
                    </ul>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-6">
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <Button
                  type="button"
                  onClick={onDelete}
                  disabled={pending || isDeletingCard || !hasUserPermission}
                  variant={"secondary"}
                  className="bg-red-600/10 dark:bg-red-500/10 
                dark:text-red-500 text-red-600"
                >
                  <ShieldAlert className="mr-1 size-5" />
                  <span>Deletar Card</span>

                  {pending && (
                    <div className="animate-spin ml-2">
                      <Loader className="h-4 w-4" />
                    </div>
                  )}

                  {isDeletingCard && (
                    <Loader className="ml-2 h-4 w-4 animate-spin" />
                  )}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <DialogFooter
            className="mt-6 flex 
            items-end justify-end"
          >
            <div className="flex gap-2">
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
                disabled={
                  pending ||
                  !title.trim() ||
                  !description.trim() ||
                  !dueDate ||
                  (isEditing && !isDirty) ||
                  !hasUserPermission
                }
              >
                {isEditing ? "Atualizar" : "Criar"} Card
                {pending && <Loader className="ml-2 h-4 w-4 animate-spin" />}
              </Button>
            </div>
          </DialogFooter>
        </>
      )}
    </>
  );
};

const CardModal = ({
  isOpen,
  onClose,
  card,
  columnId,
  businessId,
}: CardModalProps): JSX.Element => {
  const isEditing = !!card;
  const defaultState: CardModalFormState = {};

  const { invalidateKanbanQueries } = useKanbanQueryClient();
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const handleCopyID = (cardId: string) => {
    navigator.clipboard
      .writeText(cardId)
      .then(() => {
        setIsCopied(true);
        toast.success("ID do card copiado para a área de transferência!");

        // Reset after 2 seconds
        setTimeout(() => {
          setIsCopied(false);
        }, 2000);
      })
      .catch((err) => {
        toast.error("Erro ao copiar o ID: " + err);
      });
  };

  const [state, dispatch] = useFormState(
    isEditing ? handleUpdateKanbanCard : handleCreateKanbanCard,
    null,
  );

  const { formRef } = useCardModal({
    state,
    onClose,
    isEditing,
    businessId,
  });

  const [isDeletingCard, setIsDeletingCard] = useState<boolean>(false);

  const handleDelete = async () => {
    if (!card) return;
    setIsDeletingCard(true);

    try {
      const { successMessage, deleteCardError } = await handleDeleteKanbanCard({
        cardId: card.id,
      });

      if (deleteCardError) {
        toast.error(deleteCardError);
        return;
      }

      try {
        await invalidateKanbanQueries(businessId);
      } catch (error: any) {
        toast.error(error.message);
      }

      toast.success(successMessage);
    } finally {
      setIsDeletingCard(false);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogScrollContent
        className="max-w-xl"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1.5 text-left">
              <DialogTitle className="text-left">
                {isEditing ? "Editar" : "Novo"} Card
              </DialogTitle>
              <DialogDescription className="text-left">
                {isEditing
                  ? "Edite os detalhes do card existente"
                  : "Adicione um novo card à coluna"}
              </DialogDescription>
            </div>
            {isEditing && card && (
              <Button
                type="button"
                variant={isCopied ? "default" : "outline"}
                size="sm"
                onClick={() => handleCopyID(card.id)}
                className={cn(
                  "flex items-center gap-2 text-xs transition-all duration-300",
                  isCopied && "bg-green-500 hover:bg-green-600 text-white",
                )}
                disabled={isCopied}
              >
                {isCopied ? (
                  <>
                    <CheckCircle2 className="h-3 w-3 animate-in zoom-in duration-200" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    Copiar ID
                  </>
                )}
              </Button>
            )}
          </div>
          {isEditing && card && (
            <div
              className="text-xs text-muted-foreground 
              mt-2 p-2 bg-muted/30 rounded-md text-left"
            >
              <span className="font-medium">ID do Card:</span>{" "}
              <code
                className="font-mono text-[10px] 
                bg-background px-1 py-0.5 rounded"
              >
                {card.id}
              </code>
            </div>
          )}
        </DialogHeader>

        <form
          ref={formRef}
          action={(formData) => {
            if (isEditing) {
              formData.append("cardId", card.id);
            }

            const assignedUserValue = formData.get("assignedUserId");

            if (assignedUserValue === "none") {
              formData.set("assignedUserId", "");
            }

            formData.append("columnId", columnId);
            dispatch(formData);
          }}
        >
          <CardModalForm
            card={card}
            businessId={businessId}
            onDelete={handleDelete}
            onClose={onClose}
            state={state ?? defaultState}
            isEditing={isEditing}
            isDeletingCard={isDeletingCard}
          />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { CardModal };
