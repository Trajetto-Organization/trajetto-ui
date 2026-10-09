"use server";

import { logActionError } from "@/lib/log-action-error";
import { createVehicleSchema } from "@/schemas/create-update-vehicle-schema";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";

interface CreateVehicleResponse {
  code?: string;
  message: string;
}

const handleCreateVehicle = async (
  state: unknown,
  createVehicleValues: FormData,
) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      createVehicleError: {
        createVehicleErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  const businessId = createVehicleValues.get("businessId");
  const url = `${process.env.HTTP_REQUEST}/vehicle/create-vehicle/${businessId}`;

  const { businessId: _business, ...fields } = Object.fromEntries(
    createVehicleValues.entries(),
  );

  const createVehicleValidation = createVehicleSchema.safeParse(fields);

  if (!createVehicleValidation.success) {
    return {
      createVehicleError: createVehicleValidation.error.flatten().fieldErrors,
    };
  }

  try {
    const response = await apiFetch(url, {
      credentials: "include",
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(createVehicleValidation.data),
    });

    const { message } = (await response.json()) as CreateVehicleResponse;

    if (!response.ok) {
      // The API's own sentence: a plate taken in this company, the
      // contracted limit with its count, a relation that does not exist.
      return {
        createVehicleError: {
          createVehicleErrorMessage:
            message || "Não foi possível criar o veículo.",
        },
      };
    }

    return { successMessage: message };
  } catch (error) {
    logActionError("vehicle/create-vehicle", error);
    return {
      createVehicleError: {
        createVehicleErrorMessage:
          "Ocorreu um erro inesperado ao tentar criar o veículo.",
      },
    };
  }
};

export { handleCreateVehicle };
