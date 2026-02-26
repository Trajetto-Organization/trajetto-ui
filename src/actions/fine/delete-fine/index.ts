"use server";

import { getCookies } from "../../cookies";

interface DeleteFineProps {
  fineId: string;
}

interface DeleteFineResponseProps {
  message: string;
}

const handleDeleteFine = async ({ fineId }: DeleteFineProps) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      deleteFineError: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  const deleteFine = `${process.env.HTTP_REQUEST}/fines/delete-fine/${fineId}`;

  try {
    const response = await fetch(deleteFine, {
      credentials: "include",
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } = (await response.json()) as DeleteFineResponseProps;

    if (!response.ok && message) {
      return { deleteFineError: message };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      deleteFineError: "Ocorreu um erro inesperado ao tentar deletar a multa.",
    };
  }
};

export { handleDeleteFine };
