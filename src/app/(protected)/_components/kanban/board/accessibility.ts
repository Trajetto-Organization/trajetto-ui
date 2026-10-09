import type {
  Announcements,
  ScreenReaderInstructions,
  UniqueIdentifier,
} from "@dnd-kit/core";

/**
 * What a screen reader hears while a card or a column is dragged.
 *
 * Without this, dnd-kit reads its English defaults ("To pick up a draggable
 * item, press the space bar…", "Picked up draggable item <id>"), with the
 * raw id in place of a name. The texts here name the card or the column and
 * where it is, from the board as it is on screen. Pure (no React), tested in
 * tests/unitaires/kanban-drag-announcements.test.ts.
 *
 * Ids follow the board's sortables: a column is "column-<id>", a card is its
 * own id (see ../column and ../card).
 */
interface AnnouncedBoard {
  columns: Array<{
    id: string;
    title: string;
    cards: Array<{ id: string; title: string }>;
  }>;
}

type Target =
  | { kind: "column"; title: string }
  | { kind: "card"; title: string; column: string };

const COLUMN_PREFIX = "column-";

const quoted = (text: string): string => `"${text}"`;

function targetOf(
  board: AnnouncedBoard,
  id: UniqueIdentifier | undefined,
): Target | null {
  if (id === undefined) return null;

  const key = String(id);

  if (key.startsWith(COLUMN_PREFIX)) {
    const column = board.columns.find(
      (candidate) => candidate.id === key.slice(COLUMN_PREFIX.length),
    );

    return column ? { kind: "column", title: column.title } : null;
  }

  for (const column of board.columns) {
    const card = column.cards.find((candidate) => candidate.id === key);

    if (card) return { kind: "card", title: card.title, column: column.title };
  }

  return null;
}

/** The column a card would land in: the column itself, or the card's column. */
function columnUnder(target: Target | null): string | null {
  if (!target) return null;

  return target.kind === "column" ? target.title : target.column;
}

function named(target: Target | null): string {
  if (!target) return "Item";

  return target.kind === "card"
    ? `Cartão ${quoted(target.title)}`
    : `Coluna ${quoted(target.title)}`;
}

const SCREEN_READER_INSTRUCTIONS: ScreenReaderInstructions = {
  draggable:
    "Para pegar um cartão ou uma coluna, pressione espaço ou Enter. Use as setas para mover e espaço ou Enter para soltar. Esc cancela.",
};

function kanbanAccessibility(board: AnnouncedBoard): {
  announcements: Announcements;
  screenReaderInstructions: ScreenReaderInstructions;
} {
  return {
    screenReaderInstructions: SCREEN_READER_INSTRUCTIONS,
    announcements: {
      onDragStart({ active }) {
        const target = targetOf(board, active.id);

        if (target?.kind === "card") {
          return `${named(target)} pego na coluna ${quoted(target.column)}.`;
        }

        return target ? `${named(target)} pega.` : `${named(target)} pego.`;
      },
      onDragOver({ active, over }) {
        const target = targetOf(board, active.id);
        const column = columnUnder(targetOf(board, over?.id));

        if (!column) return `${named(target)} fora das colunas.`;

        return target?.kind === "column"
          ? `${named(target)} sobre a posição da coluna ${quoted(column)}.`
          : `${named(target)} sobre a coluna ${quoted(column)}.`;
      },
      onDragEnd({ active, over }) {
        const target = targetOf(board, active.id);
        const column = columnUnder(targetOf(board, over?.id));

        if (target?.kind === "column") {
          return column
            ? `${named(target)} solta na posição da coluna ${quoted(column)}.`
            : `${named(target)} solta fora das colunas.`;
        }

        return column
          ? `${named(target)} solto na coluna ${quoted(column)}.`
          : `${named(target)} solto fora das colunas.`;
      },
      onDragCancel({ active }) {
        const target = targetOf(board, active.id);

        if (!target) return "Movimento cancelado.";

        return target.kind === "card"
          ? `Movimento do cartão ${quoted(target.title)} cancelado.`
          : `Movimento da coluna ${quoted(target.title)} cancelado.`;
      },
    },
  };
}

export { kanbanAccessibility, type AnnouncedBoard };
