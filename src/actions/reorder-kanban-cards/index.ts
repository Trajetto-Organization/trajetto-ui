"use server";

import { reorderKanbanCardsSchema } from "@/schemas/reorder-kanban-cards-schema";
import { getCookies } from "../cookies";

interface ReorderKanbanCardsProps {
  message: string;
}

const handleReorderKanbanCards = async (reorderData: {
  cards: Array<{ id: string; position: number; columnId: string }>;
}) => {
  const reorderCards = `${process.env.HTTP_REQUEST}/kanban/cards/reorder`;
  const tokenAccess = await getCookies("tkey");

  const reorderValidation = reorderKanbanCardsSchema.safeParse(reorderData);

  if (reorderValidation.error) {
    const formatError = reorderValidation.error.flatten();

    return {
      reorderCardsError: formatError.fieldErrors,
    };
  }

  try {
    const response = await fetch(reorderCards, {
      credentials: "include",
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(reorderData),
    });

    const { message } = (await response.json()) as ReorderKanbanCardsProps;

    if (!response.ok && message) {
      return {
        reorderCardsError: { reorderCardsErrorMessage: message },
      };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      reorderCardsError: {
        reorderCardsErrorMessage:
          "Ocorreu um erro inesperado ao tentar reordenar os cards.",
      },
    };
  }
};

export { handleReorderKanbanCards };
