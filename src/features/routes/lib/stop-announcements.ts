import type {
  Announcements,
  ScreenReaderInstructions,
  UniqueIdentifier,
} from "@dnd-kit/core";

import { stopMoveAnnouncement } from "./stop-order";

/**
 * What a screen reader hears while a stop is dragged (decision 14.7, D6), in
 * the format of the kanban's announcements: the delivery by name and its
 * position, never dnd-kit's English defaults with the raw id. Pure.
 */
interface AnnouncedStop {
  id: string;
  title: string;
}

const STOP_INSTRUCTIONS: ScreenReaderInstructions = {
  draggable:
    "Para pegar uma entrega, pressione espaço ou Enter. Use as setas para cima e para baixo para mudar a posição e espaço ou Enter para soltar. Esc cancela.",
};

function stopListAccessibility(stops: readonly AnnouncedStop[]): {
  announcements: Announcements;
  screenReaderInstructions: ScreenReaderInstructions;
} {
  const total = stops.length;

  const indexOf = (id: UniqueIdentifier | undefined) =>
    id === undefined ? -1 : stops.findIndex((stop) => stop.id === String(id));

  const titleOf = (id: UniqueIdentifier) =>
    stops[indexOf(id)]?.title ?? "Entrega";

  return {
    screenReaderInstructions: STOP_INSTRUCTIONS,
    announcements: {
      onDragStart: ({ active }) =>
        `${titleOf(active.id)} pega, na posição ${indexOf(active.id) + 1} de ${total}.`,

      onDragOver: ({ active, over }) => {
        const target = indexOf(over?.id);

        return target < 0
          ? `${titleOf(active.id)} fora da lista.`
          : `${titleOf(active.id)} sobre a posição ${target + 1} de ${total}.`;
      },

      onDragEnd: ({ active, over }) => {
        const target = indexOf(over?.id);

        return target < 0
          ? `${titleOf(active.id)} solta fora da lista; a ordem não mudou.`
          : stopMoveAnnouncement(titleOf(active.id), target + 1, total);
      },

      onDragCancel: ({ active }) =>
        `Movimento cancelado. ${titleOf(active.id)} voltou para a posição ${indexOf(active.id) + 1}.`,
    },
  };
}

export { STOP_INSTRUCTIONS, stopListAccessibility };
