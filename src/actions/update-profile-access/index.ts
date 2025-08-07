"use server";

import { createUpdateProfileAccessSchema } from "@/schemas/create-update-profile-access-schema";
import { getCookies } from "../cookies";

interface EditBusinessProps {
  message: string;
}

const handleUpdateProfileAccess = async (
  state: any,
  updateProfileAccessValues: FormData,
) => {
  if (updateProfileAccessValues.type === "RESET") {
    return {};
  }

  const profileAccessId = updateProfileAccessValues.get("profileAccessId");

  const updateProfileAccess = `${process.env.HTTP_REQUEST}/profile-access/update-profile-access/${profileAccessId}`;
  const tokenAccess = await getCookies("tkey");

  const profileAccessValues = Object.fromEntries(
    updateProfileAccessValues.entries(),
  );

  const updateProfileAccessValidation =
    createUpdateProfileAccessSchema.safeParse(profileAccessValues);

  if (updateProfileAccessValidation.error) {
    const formatError = updateProfileAccessValidation.error.flatten();

    return {
      updateProfileAccessError: formatError.fieldErrors,
    };
  }

  const businessData = updateProfileAccessValidation.data;

  try {
    const response = await fetch(updateProfileAccess, {
      credentials: "include",
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(businessData),
    });

    const { message } = (await response.json()) as EditBusinessProps;

    if (!response.ok && message) {
      return {
        updateProfileAccessError: { updateProfileAccessErrorMessage: message },
      };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      updateProfileAccessError: {
        updateProfileAccessErrorMessage:
          "Ocorreu um erro inesperado ao tentar atualizar o perfil de acesso.",
      },
    };
  }
};

export { handleUpdateProfileAccess };
