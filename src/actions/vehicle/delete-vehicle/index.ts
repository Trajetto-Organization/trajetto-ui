"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";

interface DeleteVehicleProps {
  businessId: string;
  vehicleId: string;
}

interface DeleteVehicleResponseProps {
  message: string;
}

const handleDeleteVehicle = async ({
  businessId,
  vehicleId,
}: DeleteVehicleProps) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      deleteVehicleError:
        "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  const deleteVehicle = `${process.env.HTTP_REQUEST}/vehicle/delete-vehicle/${vehicleId}/business/${businessId}`;

  try {
    const response = await apiFetch(deleteVehicle, {
      credentials: "include",
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } = (await response.json()) as DeleteVehicleResponseProps;

    if (!response.ok) {
      return { deleteVehicleError: message || refusalMessage(response.status) };
    }

    return { successMessage: message };
  } catch (error) {
    logActionError("vehicle/delete-vehicle", error);
    return {
      deleteVehicleError:
        "Ocorreu um erro inesperado ao tentar deletar o veículo.",
    };
  }
};

export { handleDeleteVehicle };
