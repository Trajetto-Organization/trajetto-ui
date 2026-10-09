"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";
import { revalidateTagName } from "../../revalidate";
import { apiFetch } from "@/lib/api-fetch";

interface UpdateTwoFactorAuthenticationProps {
  message: string;
}

const handleUpdateTwoFactorAuthentication = async () => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      twoFactorAuthenticationError:
        "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  const updateTwoFactorAuthentication = `${process.env.HTTP_REQUEST}/user/twofactor`;

  try {
    const response = await apiFetch(updateTwoFactorAuthentication, {
      credentials: "include",
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } =
      (await response.json()) as UpdateTwoFactorAuthenticationProps;

    if (!response.ok) {
      return {
        twoFactorAuthenticationError:
          message || refusalMessage(response.status),
      };
    }

    await revalidateTagName("update-2fa");
    return { successMessage: message };
  } catch (error) {
    logActionError("user/update-two-factor-authentication", error);
    return {
      twoFactorAuthenticationError:
        "Ocorreu um erro inesperado ao tentar atualizar a autenticação de dois fatores.",
    };
  }
};

export { handleUpdateTwoFactorAuthentication };
