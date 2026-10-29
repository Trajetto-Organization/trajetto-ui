"use server";

import { logActionError } from "@/lib/log-action-error";
import { createVehicleTypeSchema } from "@/schemas/create-update-vehicle-type-schema";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";

interface VehicleTypeResponse {
  code?: string;
  message: string;
}

const handleCreateVehicleType = async (
  state: unknown,
  createVehicleTypeValues: FormData,
) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      createVehicleTypeError: {
        createVehicleTypeErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  const businessId = createVehicleTypeValues.get("businessId");
  const url = `${process.env.HTTP_REQUEST}/vehicle-type/create-vehicle-type/${businessId}`;

  const { businessId: _business, ...fields } = Object.fromEntries(
    createVehicleTypeValues.entries(),
  );

  const validation = createVehicleTypeSchema.safeParse(fields);

  if (!validation.success) {
    return { createVehicleTypeError: validation.error.flatten().fieldErrors };
  }

  try {
    const response = await apiFetch(url, {
      credentials: "include",
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(validation.data),
    });

    const { message } = (await response.json()) as VehicleTypeResponse;

    if (!response.ok) {
      return {
        createVehicleTypeError: {
          createVehicleTypeErrorMessage:
            message || "Não foi possível criar o tipo de veículo.",
        },
      };
    }

    return { successMessage: message };
  } catch (error) {
    logActionError("vehicle-type/create-vehicle-type", error);
    return {
      createVehicleTypeError: {
        createVehicleTypeErrorMessage:
          "Ocorreu um erro inesperado ao tentar criar o tipo de veículo.",
      },
    };
  }
};

export { handleCreateVehicleType };
