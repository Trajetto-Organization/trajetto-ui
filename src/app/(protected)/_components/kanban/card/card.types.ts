import type { KanbanCard } from "../shared/common.types";

interface CardProps {
  card: KanbanCard;
  onClick?: () => void;
  isDragging?: boolean;
}

export type { CardProps };
