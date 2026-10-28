"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";
import { revalidateTagName } from "@/actions/revalidate";

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
    const response = await apiFetch(deleteFuel, {
      credentials: "include",
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } = (await response.json()) as DeleteFuelResponseProps;

    if (!response.ok) {
      return { deleteFuelError: message || refusalMessage(response.status) };
    }

    // Re-renders the screen in this same response: the client no longer
    // asks for it in a second request.
    await revalidateTagName("delete-fuel");

    return { successMessage: message };
  } catch (error) {
    logActionError("fuel/delete-fuel", error);
    return {
      deleteFuelError:
        "Ocorreu um erro inesperado ao tentar deletar o abastecimento.",
    };
  }
};

export { handleDeleteFuel };
