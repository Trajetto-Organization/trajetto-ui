"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { KanbanCard } from "../dto";
import { cn } from "@/lib/utils";

import { AlertCircle, CalendarIcon, CheckCircle2, Tag } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface CardProps {
  card: KanbanCard;
  onClick?: () => void;
  isDragging?: boolean;
}

const priorityColors = {
  low: "bg-blue-100 text-blue-600",
  medium: "bg-amber-100 text-amber-600",
  high: "bg-red-100 text-red-600",
  urgent: "bg-purple-100 text-purple-600",
};

const priorityLabels = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  urgent: "Urgente",
};

// Function to convert date string (DD/MM/YYYY or ISO) to Date
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

const Card = ({ card, onClick, isDragging = false }: CardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: card.id,
      data: {
        type: "card",
        card,
      },
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const dueDate = parseCardDate(card.dueDate || "");
  const isCompleted = card.completed || false;

  const isOverdue = dueDate ? dueDate < new Date() && !isCompleted : false;

  const formatDueDate = (date: Date) => {
    try {
      return format(date, "dd MMM", { locale: ptBR });
    } catch (error) {
      return "Data inválida";
    }
  };

  // Assigned user - check if exists
  const assignedUser =
    card.assignedTo ||
    (card.assignedUserId
      ? {
          id: card.assignedUserId,
          name: card.assignedUser?.name,
          email: card.assignedUser?.email,
          avatar: null,
        }
      : null);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        "relative p-3 bg-card border rounded-md shadow-sm cursor-pointer",
        "hover:shadow-md transition-all group",
        isDragging && "opacity-50",
        isCompleted && "opacity-70 bg-muted/40 border-dashed border-green-200",
      )}
    >
      {/* Card Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4
          className={cn(
            "text-sm font-medium line-clamp-2 relative z-10",
            isCompleted &&
              "text-muted-foreground line-through decoration-green-500 decoration-2",
          )}
        >
          {card.title}
        </h4>

        {isCompleted ? (
          <CheckCircle2
            className="h-4 w-4 text-green-500 
            flex-shrink-0 relative z-10"
          />
        ) : isOverdue ? (
          <AlertCircle
            className="h-4 w-4 text-destructive 
            flex-shrink-0 relative z-10"
          />
        ) : null}
      </div>

      {/* Card Content */}
      {card.description && (
        <p
          className={cn(
            "text-xs text-muted-foreground mb-3 line-clamp-2 relative z-10",
            isCompleted && "line-through decoration-green-500/70 decoration-1",
          )}
        >
          {card.description}
        </p>
      )}

      {/* Card Footer */}
      <div
        className="flex flex-wrap items-center 
        gap-2 mt-2 relative z-10"
      >
        {/* Priority Badge */}
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] h-5 px-1.5",
            priorityColors[card.priority],
            isCompleted && "opacity-60",
          )}
        >
          <Tag className="h-3 w-3 mr-1" />
          {priorityLabels[card.priority]}
        </Badge>

        {/* Due Date */}
        {dueDate && (
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] h-5 px-1.5",
              isOverdue && !isCompleted
                ? "bg-red-50 text-red-600"
                : isCompleted
                  ? "bg-green-50 text-green-600"
                  : "bg-gray-100 text-gray-600",
              isCompleted && "opacity-70",
            )}
          >
            {isCompleted ? (
              <CheckCircle2 className="h-3 w-3 mr-1" />
            ) : isOverdue ? (
              <AlertCircle className="h-3 w-3 mr-1" />
            ) : (
              <CalendarIcon className="h-3 w-3 mr-1" />
            )}
            {formatDueDate(dueDate)}
          </Badge>
        )}

        {/* Assigned User */}
        {assignedUser && (
          <div className={cn("ml-auto", isCompleted && "opacity-70")}>
            <Avatar className="h-6 w-6">
              <AvatarImage src={assignedUser.avatar || ""} />
              <AvatarFallback className="text-[10px]">
                {assignedUser.name?.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        )}
      </div>

      {isCompleted && (
        <div
          className="absolute inset-0 bg-green-500/5 
          rounded-md pointer-events-none"
        />
      )}
    </div>
  );
};

export { Card };
