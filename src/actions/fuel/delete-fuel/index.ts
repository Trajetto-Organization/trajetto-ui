"use server";

import { getCookies } from "../../cookies";

interface DeleteFuelProps {
  businessId: string;
  fuelId: string;
}

interface DeleteFuelResponseProps {
  message: string;
}

const handleDeleteFuel = async ({ businessId, fuelId }: DeleteFuelProps) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      deleteFuelError: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  const deleteFuel = `${process.env.HTTP_REQUEST}/fuel/delete-fuel/${fuelId}/business/${businessId}`;

  try {
    const response = await fetch(deleteFuel, {
      credentials: "include",
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } = (await response.json()) as DeleteFuelResponseProps;

    if (!response.ok && message) {
      return { deleteFuelError: message };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      deleteFuelError:
        "Ocorreu um erro inesperado ao tentar deletar o abastecimento.",
    };
  }
};

export { handleDeleteFuel };
