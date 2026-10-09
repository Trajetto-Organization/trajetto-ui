"use client";

import { useMemo } from "react";

import { Column } from "../column";
import { Card } from "../card";

import { CardModal } from "../card/card-modal";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

import { DndContext, DragOverlay } from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";

import type { KanbanBoardProps } from "./board.types";
import { Loader } from "lucide-react";

import { useHasPermission } from "@/lib/user-has-permission";
import { permissions } from "@/lib/permissions";

import { kanbanAccessibility } from "./accessibility";
import { useKanbanBoard } from "./hooks";

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

  const {
    activeCard,
    activeColumn,
    columnIds,
    customCollisionDetection,
    handleCardClick,
    handleDragEnd,
    handleDragOver,
    handleDragStart,
    isCardModalOpen,
    scrollContainerRef,
    selectedCard,
    selectedColumnId,
    sensors,
    board,
    draggedItemType,
    setIsCardModalOpen,
    setSelectedCard,
    setSelectedColumnId,
  } = useKanbanBoard({ initialBoard });

  // pt-BR instructions and announcements naming the card or the column, in
  // place of dnd-kit's English defaults (tested).
  const accessibility = useMemo(() => kanbanAccessibility(board), [board]);

  return (
    <div className="h-full">
      <DndContext
        sensors={sensors}
        collisionDetection={customCollisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        accessibility={accessibility}
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

            {/* Trigger to load more columns */}
            {hasMore && (
              <div
                ref={lastElementRef}
                className="min-w-[300px] flex 
                items-center justify-center h-96"
              >
                {loading && (
                  <Loader
                    className="h-6 w-6 animate-spin 
                    text-muted-foreground"
                  />
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
