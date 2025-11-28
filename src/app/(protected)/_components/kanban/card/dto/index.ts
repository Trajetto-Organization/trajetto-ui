import { KanbanCard } from "../../dto";

interface CardProps {
  card: KanbanCard;
  onClick?: () => void;
  isDragging?: boolean;
}

export type { CardProps };
