"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";
import { revalidateTagName } from "@/actions/revalidate";

interface DeleteFuelTypeProps {
  businessId: string;
  fuelTypeId: string;
}

interface DeleteFuelTypeResponseProps {
  message: string;
}

const handleDeleteFuelType = async ({
  businessId,
  fuelTypeId,
}: DeleteFuelTypeProps) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      deleteFuelTypeError:
        "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  const deleteFuelType = `${process.env.HTTP_REQUEST}/fuel-type/delete-fuel-type/${fuelTypeId}/business/${businessId}`;

  try {
    const response = await apiFetch(deleteFuelType, {
      credentials: "include",
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } = (await response.json()) as DeleteFuelTypeResponseProps;

    if (!response.ok) {
      return {
        deleteFuelTypeError: message || refusalMessage(response.status),
      };
    }

    // Re-renders the screen in this same response: the client no longer
    // asks for it in a second request.
    await revalidateTagName("delete-fuel-type");

    return { successMessage: message };
  } catch (error) {
    logActionError("fuel-type/delete-fuel-type", error);
    return {
      deleteFuelTypeError:
        "Ocorreu um erro inesperado ao tentar deletar o tipo do combustível.",
    };
  }
};

export { handleDeleteFuelType };
