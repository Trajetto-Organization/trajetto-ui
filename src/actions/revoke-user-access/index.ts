"use server";

import { getCookies } from "../cookies";

interface RevokeUserAccessProps {
  message: string;
}

const handleRevokeUserAccess = async (userId: string) => {
  const revokeUserAccess = `${process.env.HTTP_REQUEST}/user/revoke-access/${userId}`;
  const tokenAccess = await getCookies("tkey");

  try {
    const response = await fetch(revokeUserAccess, {
      credentials: "include",
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } = (await response.json()) as RevokeUserAccessProps;

    if (!response.ok && message) {
      return { revokeAccessUserError: message };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      revokeAccessUserError:
        "Ocorreu um erro inesperado ao tentar revogar o acesso do usuário.",
    };
  }
};

export { handleRevokeUserAccess };
