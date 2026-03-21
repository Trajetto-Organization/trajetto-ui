"use client";

import { useState } from "react";
import { KanbanColumn as ColumnType, KanbanCard } from "../shared/common.types";

import { Card } from "../card";
import { Button } from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  GripVertical,
} from "lucide-react";

import { cn } from "@/lib/utils";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { UpdateColumnDialog } from "./update-column-dialog";
import { DeleteColumnDialog } from "./delete-column-dialog";

import { useHasPermission } from "@/lib/user-has-permission";
import { permissions } from "@/lib/permissions";

interface ColumnProps {
  column: ColumnType;
  onCardClick: (card: KanbanCard) => void;
  onAddCard: () => void;
  isOverlay?: boolean;
}

const Column = ({
  column,
  onCardClick,
  onAddCard,
  isOverlay,
}: ColumnProps): JSX.Element => {
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState<boolean>(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);

  const hasUserPermission = useHasPermission(
    permissions.KANBAN_MANAGE,
    "write",
  );

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `column-${column.id}`,
    data: {
      type: "column",
      column,
    },
    disabled: !hasUserPermission, // Disables sortable when not allowed
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1, // Make the original column invisible when dragging
  };

  const cardIds = column.cards.map((card) => card.id);

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        borderTop: `3px solid ${column.color || "#64748b"}`,
        minHeight: isOverlay ? "150px" : "300px",
      }}
      className={cn("min-w-[300px] max-w-[300px] bg-muted/30 rounded-lg")}
    >
      <div className="p-4">
        <div
          className="flex items-center 
          justify-between mb-4"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div
              className={cn(
                hasUserPermission
                  ? "cursor-grab active:cursor-grabbing"
                  : "cursor-not-allowed opacity-50",
              )}
              {...(hasUserPermission ? attributes : {})}
              {...(hasUserPermission ? listeners : {})}
            >
              <GripVertical
                className={cn(
                  "h-4 w-4",
                  hasUserPermission
                    ? "text-muted-foreground"
                    : "text-muted-foreground/50",
                )}
              />
            </div>

            <h3 className="font-semibold text-sm truncate">{column.title}</h3>

            <span
              className="text-xs text-muted-foreground 
              bg-muted px-2 py-1 rounded-full shrink-0"
            >
              {column.cards.length}
            </span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setIsUpdateDialogOpen(true)}
                className="cursor-pointer"
                disabled={!hasUserPermission}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive cursor-pointer"
                onClick={() => setIsDeleteDialogOpen(true)}
                disabled={!hasUserPermission}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Column Cards */}
        <div className="space-y-3">
          <SortableContext
            items={cardIds}
            strategy={verticalListSortingStrategy}
            disabled={!hasUserPermission}
          >
            {column.cards.map((card) => (
              <Card
                key={card.id}
                card={card}
                onClick={() => onCardClick(card)}
              />
            ))}
          </SortableContext>
        </div>

        {/* Add Card Button */}
        <Button
          variant="ghost"
          className="w-full justify-start mt-3 
          text-muted-foreground hover:text-foreground"
          onClick={onAddCard}
          disabled={!hasUserPermission}
        >
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Card
        </Button>
      </div>

      {isUpdateDialogOpen && (
        <UpdateColumnDialog
          isOpen={isUpdateDialogOpen}
          onClose={() => setIsUpdateDialogOpen(false)}
          column={column}
        />
      )}

      {isDeleteDialogOpen && (
        <DeleteColumnDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          column={column}
        />
      )}
    </div>
  );
};

export { Column };
