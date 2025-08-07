"use server";

import { getCookies } from "../cookies";

interface DeletePartProps {
  businessId: string;
  partId: string;
}

interface DeletePartResponseProps {
  message: string;
}

const handleDeletePart = async ({ businessId, partId }: DeletePartProps) => {
  const deletePart = `${process.env.HTTP_REQUEST}/part/delete-part/${partId}/business/${businessId}`;
  const tokenAccess = await getCookies("tkey");

  try {
    const response = await fetch(deletePart, {
      credentials: "include",
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } = (await response.json()) as DeletePartResponseProps;

    if (!response.ok && message) {
      return { deletePartError: message };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      deletePartError: "Ocorreu um erro inesperado ao tentar deletar a peça.",
    };
  }
};

export { handleDeletePart };
