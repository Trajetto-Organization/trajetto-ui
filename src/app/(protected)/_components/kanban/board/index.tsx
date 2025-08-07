"use client";

import { useState, useRef, useEffect } from "react";
import {
  KanbanBoard as KanbanBoardType,
  KanbanCard,
  KanbanColumn,
} from "../dto";

import { Column } from "../column";
import { Card } from "../card";

import { CardModal } from "../card/card-modal";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

import { Loader } from "lucide-react";
import { toast } from "sonner";

import {
  DndContext,
  DragOverlay,
  useSensors,
  useSensor,
  PointerSensor,
  KeyboardSensor,
  pointerWithin,
  rectIntersection,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";

import {
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";

import { handleReorderKanbanColumns } from "@/actions/reorder-kanban-columns";
import { handleReorderKanbanCards } from "@/actions/reorder-kanban-cards";

import {
  ReorderKanbanCardsState,
  ReorderKanbanColumnState,
} from "../board/dto";

import { useHasPermission } from "@/lib/user-has-permission";
import { permissions } from "@/lib/permissions";

interface KanbanBoardProps {
  board: KanbanBoardType;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
  lastElementRef?: (node: HTMLDivElement) => void;
}

interface OriginalPositions {
  card?: {
    id: string;
    originalPosition: number;
    originalColumnId: string;
  };
  column?: {
    id: string;
    originalPosition: number;
  };
}

const KanbanBoard = ({
  board: initialBoard,
  hasMore = false,
  loading = false,
  lastElementRef,
}: KanbanBoardProps): JSX.Element => {
  const hasUserPermission = useHasPermission(
    permissions.KANBAN_MANAGE,
    "write",
  );

  const safeBoard = {
    ...initialBoard,
    columns: initialBoard.columns || [],
  };

  const [board, setBoard] = useState(safeBoard);

  const [activeCard, setActiveCard] = useState<KanbanCard | null>(null);
  const [activeColumn, setActiveColumn] = useState<KanbanColumn | null>(null);

  const [draggedItemType, setDraggedItemType] = useState<
    "card" | "column" | null
  >(null);
  const [originalPositions, setOriginalPositions] = useState<OriginalPositions>(
    {},
  );

  // Modal states
  const [selectedCard, setSelectedCard] = useState<KanbanCard | null>(null);
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);

  const [isCardModalOpen, setIsCardModalOpen] = useState(false);

  // Ref para o observer do scroll infinito
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Atualizar board quando receber novos dados
  useEffect(() => {
    setBoard({
      ...initialBoard,
      columns: initialBoard.columns || [],
    });
  }, [initialBoard]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const customCollisionDetection = (args: any) => {
    const pointerWithinCollisions = pointerWithin(args);

    if (pointerWithinCollisions.length > 0) {
      return pointerWithinCollisions;
    }

    return rectIntersection(args);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeId = active.id as string;

    if (activeId.startsWith("column-")) {
      const columnId = activeId.replace("column-", "");
      const column = board.columns.find((col) => col.id === columnId);

      if (column) {
        setActiveColumn(column);
        setDraggedItemType("column");

        const originalPosition = board.columns.findIndex(
          (col) => col.id === columnId,
        );
        setOriginalPositions({
          column: {
            id: columnId,
            originalPosition,
          },
        });
      }
      return;
    }

    for (const column of board.columns) {
      const card = column.cards.find((c) => c.id === activeId);
      if (card) {
        setActiveCard(card);
        setDraggedItemType("card");

        setOriginalPositions({
          card: {
            id: activeId,
            originalPosition: card.position,
            originalColumnId: card.columnId,
          },
        });
        break;
      }
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId.startsWith("column-") && overId.startsWith("column-")) return;
    if (activeId.startsWith("column-") && !overId.startsWith("column-")) {
      for (const column of board.columns) {
        if (column.cards.some((card) => card.id === overId)) return;
      }
    }

    if (!activeId.startsWith("column-")) {
      let sourceColumn: KanbanColumn | undefined;
      let targetColumn: KanbanColumn | undefined;

      let activeCardData: KanbanCard | undefined;

      for (const column of board.columns) {
        const card = column.cards.find((c) => c.id === activeId);
        if (card) {
          sourceColumn = column;
          activeCardData = card;
          break;
        }
      }

      if (!sourceColumn || !activeCardData) return;

      if (overId.startsWith("column-")) {
        targetColumn = board.columns.find(
          (col) => col.id === overId.replace("column-", ""),
        );

        if (targetColumn && sourceColumn.id !== targetColumn.id) {
          setBoard((prev) => {
            const newColumns = [...prev.columns];
            const sourceColIndex = newColumns.findIndex(
              (col) => col.id === sourceColumn!.id,
            );
            const targetColIndex = newColumns.findIndex(
              (col) => col.id === targetColumn!.id,
            );

            const sourceCards = newColumns[sourceColIndex].cards.filter(
              (card) => card.id !== activeId,
            );

            const updatedSourceCards = sourceCards.map((card, index) => ({
              ...card,
              position: index,
            }));

            newColumns[sourceColIndex] = {
              ...newColumns[sourceColIndex],
              cards: updatedSourceCards,
            };

            const updatedCard = {
              ...activeCardData,
              columnId: targetColumn!.id,
              position: newColumns[targetColIndex].cards.length,
            };

            newColumns[targetColIndex] = {
              ...newColumns[targetColIndex],
              cards: [...newColumns[targetColIndex].cards, updatedCard],
            };

            return { ...prev, columns: newColumns };
          });
        }
      } else {
        for (const column of board.columns) {
          if (column.cards.some((card) => card.id === overId)) {
            targetColumn = column;
            break;
          }
        }

        if (targetColumn) {
          setBoard((prev) => {
            const newColumns = [...prev.columns];
            const sourceColIndex = newColumns.findIndex(
              (col) => col.id === sourceColumn!.id,
            );
            const targetColIndex = newColumns.findIndex(
              (col) => col.id === targetColumn!.id,
            );

            if (sourceColIndex === targetColIndex) {
              const columnCards = [...newColumns[sourceColIndex].cards];
              const activeIndex = columnCards.findIndex(
                (card) => card.id === activeId,
              );
              const overIndex = columnCards.findIndex(
                (card) => card.id === overId,
              );

              if (activeIndex !== overIndex) {
                const reorderedCards = arrayMove(
                  columnCards,
                  activeIndex,
                  overIndex,
                );
                const updatedCards = reorderedCards.map((card, index) => ({
                  ...card,
                  position: index,
                }));

                newColumns[sourceColIndex] = {
                  ...newColumns[sourceColIndex],
                  cards: updatedCards,
                };
              }
            } else {
              const sourceCards = newColumns[sourceColIndex].cards.filter(
                (card) => card.id !== activeId,
              );
              const updatedSourceCards = sourceCards.map((card, index) => ({
                ...card,
                position: index,
              }));

              newColumns[sourceColIndex] = {
                ...newColumns[sourceColIndex],
                cards: updatedSourceCards,
              };

              const targetCards = [...newColumns[targetColIndex].cards];
              const overIndex = targetCards.findIndex(
                (card) => card.id === overId,
              );

              const updatedCard = {
                ...activeCardData,
                columnId: targetColumn!.id,
                position: overIndex,
              };

              targetCards.splice(overIndex, 0, updatedCard);

              const updatedTargetCards = targetCards.map((card, index) => ({
                ...card,
                position: index,
              }));

              newColumns[targetColIndex] = {
                ...newColumns[targetColIndex],
                cards: updatedTargetCards,
              };
            }

            return { ...prev, columns: newColumns };
          });
        }
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      resetDragState();
      return;
    }

    const activeId = active.id as string;
    let overId = over.id as string;

    if (draggedItemType === "column") {
      let overColumnId: string | undefined;

      if (overId.startsWith("column-")) {
        overColumnId = overId.replace("column-", "");
      } else {
        for (const column of board.columns) {
          if (column.cards.some((card) => card.id === overId)) {
            overColumnId = column.id;
            break;
          }
        }
      }

      if (!overColumnId) {
        resetDragState();
        return;
      }

      const activeColumnId = activeId.replace("column-", "");

      const oldIndex = board.columns.findIndex(
        (col) => col.id === activeColumnId,
      );
      const newIndex = board.columns.findIndex(
        (col) => col.id === overColumnId,
      );

      const originalPosition = originalPositions.column?.originalPosition;

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        if (originalPosition !== undefined && newIndex === originalPosition) {
          resetDragState();
          return;
        }

        const newColumns = arrayMove(board.columns, oldIndex, newIndex);

        const columnsToReorder = newColumns.map((col, index) => ({
          id: col.id,
          position: index,
        }));

        const updatedColumns = newColumns.map((col, index) => ({
          ...col,
          position: index,
        }));

        setBoard((prev) => ({ ...prev, columns: updatedColumns }));

        try {
          const result = (await handleReorderKanbanColumns({
            businessId: board.businessId,
            columns: columnsToReorder,
          })) as ReorderKanbanColumnState;

          if (result.reorderColumnsError) {
            toast.error(
              result.reorderColumnsError.reorderColumnsErrorMessage ||
                "Erro ao reordenar colunas",
            );

            window.location.reload();
          }
        } catch (error) {
          toast.error("Erro ao reordenar colunas");
          window.location.reload();
        }
      }
    } else if (draggedItemType === "card") {
      const originalCard = originalPositions.card;

      if (!originalCard) {
        resetDragState();
        return;
      }

      let currentCard: KanbanCard | undefined;

      let currentPosition: number | undefined;
      let currentColumnId: string | undefined;

      for (const column of board.columns) {
        const card = column.cards.find((c) => c.id === originalCard.id);
        if (card) {
          currentCard = card;

          currentPosition = card.position;
          currentColumnId = card.columnId;

          break;
        }
      }

      const positionChanged = currentPosition !== originalCard.originalPosition;
      const columnChanged = currentColumnId !== originalCard.originalColumnId;

      if (!positionChanged && !columnChanged) {
        resetDragState();
        return;
      }

      const cardsToUpdate: Array<{
        id: string;
        position: number;
        columnId: string;
      }> = [];

      for (const column of board.columns) {
        column.cards.forEach((card) => {
          cardsToUpdate.push({
            id: card.id,
            position: card.position,
            columnId: card.columnId,
          });
        });
      }

      try {
        const result = (await handleReorderKanbanCards({
          cards: cardsToUpdate,
        })) as ReorderKanbanCardsState;

        if (result.reorderCardsError) {
          toast.error(
            result.reorderCardsError.reorderCardsErrorMessage ||
              "Erro ao mover card",
          );

          window.location.reload();
        }
      } catch (error) {
        toast.error("Erro ao mover card");
        window.location.reload();
      }
    }

    resetDragState();
  };

  const resetDragState = () => {
    setActiveCard(null);
    setActiveColumn(null);
    setDraggedItemType(null);
    setOriginalPositions({});
  };

  const handleCardClick = (card: KanbanCard) => {
    setSelectedCard(card);
    setSelectedColumnId(card.columnId);
    setIsCardModalOpen(true);
  };

  const columnIds = board.columns.map((column) => `column-${column.id}`);

  return (
    <div className="h-full">
      <DndContext
        sensors={sensors}
        collisionDetection={customCollisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <ScrollArea className="h-full" ref={scrollContainerRef}>
          <div className="flex gap-4 pt-6 pb-8 items-start">
            <SortableContext
              items={columnIds}
              strategy={horizontalListSortingStrategy}
              disabled={!hasUserPermission}
            >
              {board.columns.map((column) => (
                <Column
                  key={`column-${column.id}`}
                  column={column}
                  onCardClick={handleCardClick}
                  onAddCard={() => {
                    setSelectedCard(null);
                    setSelectedColumnId(column.id);
                    setIsCardModalOpen(true);
                  }}
                  isOverlay
                />
              ))}
            </SortableContext>

            {/* Trigger para carregar mais colunas */}
            {hasMore && (
              <div
                ref={lastElementRef}
                className="min-w-[300px] flex 
                items-center justify-center h-96"
              >
                {loading && (
                  <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
                )}
              </div>
            )}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <DragOverlay>
          {activeCard && draggedItemType === "card" && (
            <Card card={activeCard} isDragging />
          )}
          {activeColumn && draggedItemType === "column" && (
            <Column
              key={`column-${activeColumn.id}`}
              column={activeColumn}
              onCardClick={handleCardClick}
              onAddCard={() => {}}
              isOverlay
            />
          )}
        </DragOverlay>
      </DndContext>

      {isCardModalOpen && (
        <CardModal
          isOpen={isCardModalOpen}
          onClose={() => setIsCardModalOpen(false)}
          card={selectedCard}
          columnId={selectedColumnId || board.columns[0]?.id || ""}
          businessId={board.businessId}
        />
      )}
    </div>
  );
};

export { KanbanBoard };
