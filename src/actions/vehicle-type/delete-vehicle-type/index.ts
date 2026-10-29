"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";

interface DeleteVehicleTypeProps {
  businessId: string;
  vehicleTypeId: string;
}

interface DeleteVehicleTypeResponseProps {
  message: string;
}

const handleDeleteVehicleType = async ({
  businessId,
  vehicleTypeId,
}: DeleteVehicleTypeProps) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      deleteVehicleTypeError:
        "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  const deleteVehicleType = `${process.env.HTTP_REQUEST}/vehicle-type/delete-vehicle-type/${vehicleTypeId}/business/${businessId}`;

  try {
    const response = await apiFetch(deleteVehicleType, {
      credentials: "include",
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } =
      (await response.json()) as DeleteVehicleTypeResponseProps;

    if (!response.ok) {
      return {
        deleteVehicleTypeError: message || refusalMessage(response.status),
      };
    }

    return { successMessage: message };
  } catch (error) {
    logActionError("vehicle-type/delete-vehicle-type", error);
    return {
      deleteVehicleTypeError:
        "Ocorreu um erro inesperado ao tentar deletar o tipo do veículo.",
    };
  }
};

export { handleDeleteVehicleType };
