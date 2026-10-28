"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { updateUserSchema } from "@/schemas/update-user-schema";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";
import { revalidateTagName } from "@/actions/revalidate";

interface UserRegistrationProps {
  message: string;
}

const handleUpdateUserRegistration = async (
  state: any,
  updateUserValues: FormData,
) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      updateUserError: {
        updateUserErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  if (updateUserValues.type === "RESET") {
    return {};
  }

  const userId = updateUserValues.get("userId");
  const updateUser = `${process.env.HTTP_REQUEST}/user/update-user/${userId}`;

  const usersValues = Object.fromEntries(updateUserValues.entries());
  const updateUserValidation = updateUserSchema.safeParse(usersValues);

  if (updateUserValidation.error) {
    const formatError = updateUserValidation.error.flatten();
    return {
      updateUserError: formatError.fieldErrors,
    };
  }

  const userData = updateUserValidation.data;

  try {
    const response = await apiFetch(updateUser, {
      credentials: "include",
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });

    const { message } = (await response.json()) as UserRegistrationProps;

    if (!response.ok) {
      return {
        updateUserError: {
          updateUserErrorMessage: message || refusalMessage(response.status),
        },
      };
    }

    // Re-renders the screen in this same response: the client no longer
    // asks for it in a second request.
    await revalidateTagName("update-user-registration");

    return { successMessage: message };
  } catch (error) {
    logActionError("user/update-user-registration", error);
    return {
      updateUserError: {
        updateUserErrorMessage:
          "Ocorreu um erro inesperado ao tentar atualizar o usuário.",
      },
    };
  }
};

export { handleUpdateUserRegistration };
