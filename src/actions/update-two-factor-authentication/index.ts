"use server";

import { getCookies } from "../cookies";
import { revalidateTagName } from "../revalidate";

interface UpdateTwoFactorAuthenticationProps {
  message: string;
}

const handleUpdateTwoFactorAuthentication = async () => {
  const updateTwoFactorAuthentication = `${process.env.HTTP_REQUEST}/user/twofactor`;
  const tokenAccess = await getCookies("tkey");

  try {
    const response = await fetch(updateTwoFactorAuthentication, {
      credentials: "include",
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } =
      (await response.json()) as UpdateTwoFactorAuthenticationProps;

    if (!response.ok && message) {
      return { twoFactorAuthenticationError: message };
    }

    await revalidateTagName("update-2fa");
    return { successMessage: message };
  } catch (error) {
    return {
      twoFactorAuthenticationError:
        "Ocorreu um erro inesperado ao tentar atualizar a autenticação de dois fatores.",
    };
  }
};

export { handleUpdateTwoFactorAuthentication };
