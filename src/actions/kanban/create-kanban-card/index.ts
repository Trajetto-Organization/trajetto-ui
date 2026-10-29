"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { createKanbanCardSchema } from "@/schemas/create-kanban-card-schema";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";

interface CreateKanbanCardProps {
  message: string;
}

const handleCreateKanbanCard = async (
  state: any,
  createCardValues: FormData,
) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      createCardError: {
        createCardErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  if (createCardValues.type === "RESET") {
    return {};
  }

  const createCard = `${process.env.HTTP_REQUEST}/kanban/card/create`;

  const cardValues = Object.fromEntries(createCardValues.entries());
  const createCardValidation = createKanbanCardSchema.safeParse(cardValues);

  if (createCardValidation.error) {
    const formatError = createCardValidation.error.flatten();

    return {
      createCardError: formatError.fieldErrors,
    };
  }

  const cardData = createCardValidation.data;

  try {
    const response = await apiFetch(createCard, {
      credentials: "include",
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cardData),
    });

    const { message } = (await response.json()) as CreateKanbanCardProps;

    if (!response.ok) {
      return {
        createCardError: {
          createCardErrorMessage: message || refusalMessage(response.status),
        },
      };
    }

    return { successMessage: message };
  } catch (error) {
    logActionError("kanban/create-kanban-card", error);
    return {
      createCardError: {
        createCardErrorMessage:
          "Ocorreu um erro inesperado ao tentar criar o card.",
      },
    };
  }
};

export { handleCreateKanbanCard };
