import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * What a screen reader hears on the Kanban board (cross-fixes note).
 *
 * The board's DndContext had no `accessibility` prop, so dnd-kit read its
 * English defaults to every screen-reader user: "To pick up a draggable
 * item, press the space bar…" as the cards' description, and "Picked up
 * draggable item 018f…" (a raw id) while moving one. The board now passes
 * pt-BR instructions and announcements that name the card or the column
 * and where it is.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

vi.mock("@/actions/kanban/reorder-kanban-columns", () => ({
  handleReorderKanbanColumns: vi.fn(),
}));
vi.mock("@/actions/kanban/reorder-kanban-cards", () => ({
  handleReorderKanbanCards: vi.fn(),
}));
vi.mock("@/lib/user-has-permission", () => ({ useHasPermission: () => true }));
vi.mock("@/app/(protected)/_components/kanban/column", () => ({
  Column: () => null,
}));
vi.mock("@/app/(protected)/_components/kanban/card", () => ({
  Card: () => null,
}));
vi.mock("@/app/(protected)/_components/kanban/card/card-modal", () => ({
  CardModal: () => null,
}));

import { kanbanAccessibility } from "@/app/(protected)/_components/kanban/board/accessibility";
import { KanbanBoard } from "@/app/(protected)/_components/kanban/board";

beforeAll(() => {
  vi.stubGlobal("React", React);
});

const BOARD = {
  businessId: "b1",
  columns: [
    {
      id: "col-todo",
      title: "A fazer",
      cards: [{ id: "card-1", title: "Trocar pneus" }],
    },
    {
      id: "col-done",
      title: "Concluído",
      cards: [{ id: "card-2", title: "Revisar freios" }],
    },
  ],
};

const ENGLISH =
  /\b(draggable|droppable|picked up|dropped|was moved|press|space bar|escape|cancel(l)?ed)\b/i;

const item = (id: string) => ({ id }) as never;

describe("the drag instructions and announcements", () => {
  const { announcements, screenReaderInstructions } =
    kanbanAccessibility(BOARD);

  it("explains in Portuguese how to pick up, move, drop and cancel", () => {
    expect(screenReaderInstructions.draggable).toMatch(/espaço/);
    expect(screenReaderInstructions.draggable).toMatch(/setas/);
    expect(screenReaderInstructions.draggable).toMatch(/Esc/);
    expect(screenReaderInstructions.draggable).not.toMatch(ENGLISH);
  });

  it("names the card and the column at every moment", () => {
    const said = [
      announcements.onDragStart({ active: item("card-1") }),
      announcements.onDragOver({
        active: item("card-1"),
        over: item("column-col-done"),
      }),
      announcements.onDragOver({
        active: item("card-1"),
        over: item("card-2"),
      }),
      announcements.onDragEnd({ active: item("card-1"), over: item("card-2") }),
      announcements.onDragCancel({ active: item("card-1"), over: null }),
    ];

    expect(said[0]).toBe('Cartão "Trocar pneus" pego na coluna "A fazer".');
    expect(said[1]).toBe('Cartão "Trocar pneus" sobre a coluna "Concluído".');
    expect(said[2]).toBe('Cartão "Trocar pneus" sobre a coluna "Concluído".');
    expect(said[3]).toBe('Cartão "Trocar pneus" solto na coluna "Concluído".');
    expect(said[4]).toBe('Movimento do cartão "Trocar pneus" cancelado.');
    expect(said.join(" ")).not.toMatch(/card-\d|col-/);
  });

  it("names the dragged column and says when nothing is under it", () => {
    expect(announcements.onDragStart({ active: item("column-col-done") })).toBe(
      'Coluna "Concluído" pega.',
    );
    expect(
      announcements.onDragOver({
        active: item("column-col-done"),
        over: item("column-col-todo"),
      }),
    ).toBe('Coluna "Concluído" sobre a posição da coluna "A fazer".');
    expect(
      announcements.onDragEnd({
        active: item("column-col-done"),
        over: item("column-col-todo"),
      }),
    ).toBe('Coluna "Concluído" solta na posição da coluna "A fazer".');
    expect(
      announcements.onDragOver({ active: item("card-2"), over: null }),
    ).toBe('Cartão "Revisar freios" fora das colunas.');
    expect(
      announcements.onDragEnd({ active: item("card-2"), over: null }),
    ).toBe('Cartão "Revisar freios" solto fora das colunas.');
  });
});

describe("the board", () => {
  let root: Root | null = null;
  let host: HTMLElement | null = null;

  afterEach(async () => {
    await act(async () => root?.unmount());
    host?.remove();
    root = null;
    host = null;
  });

  it("hands the screen reader the Portuguese instructions, not dnd-kit's", async () => {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);

    await act(async () => {
      root!.render(createElement(KanbanBoard, { board: BOARD } as never));
    });

    const text = document.body.textContent ?? "";

    expect(text).toContain("Para pegar um cartão ou uma coluna");
    expect(text).not.toMatch(/To pick up a draggable item/);
  });
});
