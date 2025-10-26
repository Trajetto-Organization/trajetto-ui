"use client";

import { useState, useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

import {
  CalendarIcon,
  Loader,
  ShieldAlert,
  Trash2,
  CheckCircle2,
  Copy,
} from "lucide-react";

import { Calendar } from "@/components/ui/calendar";

import FormInput from "@/components/custom/form-input";
import { cn } from "@/lib/utils";

import { handleCreateKanbanCard } from "@/actions/create-kanban-card";
import { handleUpdateKanbanCard } from "@/actions/update-kanban-card";

import { handleDeleteKanbanCard } from "@/actions/delete-kanban-card";

import { useCardModal } from "./hooks";
import { CardModalFormState } from "./dto";

import { KanbanCard } from "../../dto";
import { UserSelector } from "../../user-selector";

import { toast } from "sonner";

import { useKanbanQueryClient } from "../../hooks/use-query-client";
import { useHasPermission } from "@/lib/user-has-permission";

import { permissions } from "@/lib/permissions";

interface CardModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: KanbanCard | null;
  columnId: string;
  businessId: string;
}

type PriorityProps = "low" | "medium" | "high" | "urgent";

// Function to convert date string (DD/MM/YYYY or ISO) to Date - same logic as Card
const parseCardDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;

  try {
    // If it is in DD/MM/YYYY format
    if (dateStr.includes("/")) {
      const [day, month, year] = dateStr.split("/");
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }

    // If it is in ISO format or another valid format
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

const CardModalForm = ({
  card,
  businessId,
  onDelete,
  onClose,
  state,
  isEditing,
  isDeletingCard,
}: {
  card: KanbanCard | null;
  businessId: string;
  onDelete: () => void;
  onClose: () => void;
  state: CardModalFormState;
  isEditing: boolean;
  isDeletingCard: boolean;
}) => {
  const { pending } = useFormStatus();

  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  const hasUserPermission = useHasPermission(
    permissions.KANBAN_MANAGE,
    "write",
  );

  const [title, setTitle] = useState(card?.title || "");
  const [description, setDescription] = useState<string>(
    card?.description || "",
  );

  const [priority, setPriority] = useState<PriorityProps>(
    (card?.priority as PriorityProps) || "medium",
  );

  const [completed, setCompleted] = useState<boolean>(card?.completed || false);

  // Use the parseCardDate function to ensure the date is interpreted correctly
  const [dueDate, setDueDate] = useState<Date | undefined>(
    card?.dueDate ? parseCardDate(card.dueDate) || undefined : undefined,
  );

  const [assignedUserId, setAssignedUserId] = useState<string>(
    card?.assignedUserId || "none",
  );

  // Function to check if any field has been changed
  const checkIfDirty = (newValues: {
    title: string;
    description: string;
    priority: string;
    dueDate: Date | undefined;
    assignedUserId: string;
    completed: boolean;
  }) => {
    if (!isEditing || !card) {
      // For creation, check if you have the minimum necessary data
      setIsDirty(!!newValues.title.trim() && !!newValues.dueDate);
      return;
    }

    // For editing, compare with original values
    const originalDueDate = card.dueDate
      ? parseCardDate(card.dueDate)
      : undefined;
    const originalAssignedUserId = card.assignedUserId || "none";

    const hasChanges = [
      newValues.title !== card.title,
      newValues.description !== (card.description || ""),
      newValues.priority !== card.priority,
      newValues.dueDate?.toDateString() !== originalDueDate?.toDateString(),
      newValues.assignedUserId !== originalAssignedUserId,
      newValues.completed !== (card.completed || false),
    ].some(Boolean);

    setIsDirty(hasChanges);
  };

  // Handlers that update state and check isDirty
  const handleTitleChange = (value: string) => {
    setTitle(value);
    checkIfDirty({
      title: value,
      description,
      priority,
      dueDate,
      assignedUserId,
      completed,
    });
  };

  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    checkIfDirty({
      title,
      description: value,
      priority,
      dueDate,
      assignedUserId,
      completed,
    });
  };

  const handlePriorityChange = (value: PriorityProps) => {
    setPriority(value);
    checkIfDirty({
      title,
      description,
      priority: value,
      dueDate,
      assignedUserId,
      completed,
    });
  };

  const handleDueDateChange = (value: Date | undefined) => {
    setDueDate(value);
    checkIfDirty({
      title,
      description,
      priority,
      dueDate: value,
      assignedUserId,
      completed,
    });
  };

  const handleAssignedUserChange = (value: string) => {
    setAssignedUserId(value);
    checkIfDirty({
      title,
      description,
      priority,
      dueDate,
      assignedUserId: value,
      completed,
    });
  };

  // ✅ Handler para o checkbox completed
  const handleCompletedChange = (value: boolean) => {
    setCompleted(value);
    checkIfDirty({
      title,
      description,
      priority,
      dueDate,
      assignedUserId,
      completed: value,
    });
  };

  // Check initial isDirty when modal opens
  useEffect(() => {
    checkIfDirty({
      title,
      description,
      priority,
      dueDate,
      assignedUserId,
      completed,
    });
  }, [isEditing, card]);

  const errorState = isEditing ? state.updateCardError : state.createCardError;

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
          label="Título"
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
        <div className="space-y-2">
          <Label
            className={errorState?.description ? "text-red-500" : ""}
            htmlFor="description"
          >
            {errorState?.description ? errorState.description : "Descrição"}
          </Label>
          <Textarea
            id="description"
            name="description"
            value={description}
            onChange={(e) =>
              hasUserPermission ? handleDescriptionChange(e.target.value) : null
            }
            placeholder="Descreva em detalhes a tarefa..."
            className={cn(
              "resize-none min-h-[100px]",
              errorState?.description && "border-red-500",
            )}
            disabled={pending}
          />
        </div>

        {/* Priority */}
        <div className="space-y-2">
          <Label
            className={errorState?.priority ? "text-red-500" : ""}
            htmlFor="priority"
          >
            {errorState?.priority ? errorState.priority : "Prioridade"}
          </Label>
          <Select
            name="priority"
            value={priority}
            onValueChange={(value) =>
              handlePriorityChange(value as PriorityProps)
            }
            disabled={pending || !hasUserPermission}
          >
            <SelectTrigger id="priority">
              <SelectValue placeholder="Selecione a prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Baixa</SelectItem>
              <SelectItem value="medium">Média</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="urgent">Urgente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Expiration Date */}
        <div className="space-y-2">
          <Label
            htmlFor="dueDate-button"
            className={errorState?.dueDate ? "text-red-500" : ""}
          >
            {errorState?.dueDate ? errorState.dueDate : "Data de Vencimento"}
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="dueDate-button"
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !dueDate && "text-muted-foreground",
                  errorState?.dueDate && "border-red-500",
                )}
                disabled={pending || !hasUserPermission}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dueDate ? (
                  format(dueDate, "PPP", { locale: ptBR })
                ) : (
                  <span>Selecione uma data</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={dueDate}
                onSelect={handleDueDateChange}
                locale={ptBR}
                initialFocus
                disabled={!hasUserPermission}
              />
            </PopoverContent>
          </Popover>
          <input
            id="dueDate"
            type="hidden"
            name="dueDate"
            value={dueDate ? dueDate.toISOString() : ""}
            disabled={!hasUserPermission}
          />
        </div>

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
      <DialogScrollContent className="max-w-xl">
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
