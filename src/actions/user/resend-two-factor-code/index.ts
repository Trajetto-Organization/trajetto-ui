"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { headers } from "next/headers";

import { apiForwardingHeaders } from "@/lib/api-forwarding";
import { resendTwoFactorCodeSchema } from "@/schemas/resend-two-factor-code-schema";
import { twoFactorChallengeField } from "@/lib/two-factor-challenge";
import { apiFetch } from "@/lib/api-fetch";

interface ResendTwoFactorProps {
  message: string;
}

const handleResendTwoFactorCode = async (userEmail: string) => {
  const resendTwoFactorCode = `${process.env.HTTP_REQUEST}/user/resend-two-factor-code`;
  const resendTwoFactor = resendTwoFactorCodeSchema.safeParse({
    email: userEmail,
  });

  if (resendTwoFactor.error) {
    const formatError = resendTwoFactor.error.issues[0].message;
    return {
      twoFactorError: formatError,
    };
  }

  const { email } = resendTwoFactor.data;

  try {
    const response = await apiFetch(resendTwoFactorCode, {
      credentials: "include",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Anonymous route limited per address: say which browser this is for.
        ...apiForwardingHeaders(headers()),
      },
      // The challenge the password step returned, when there is one: the API
      // resends a code only to whoever just proved the password.
      body: JSON.stringify({ email, ...twoFactorChallengeField() }),
    });

    const { message } = (await response.json()) as ResendTwoFactorProps;

    if (!response.ok) {
      return {
        twoFactorError: message || refusalMessage(response.status),
      };
    }

    return { successMessage: message };
  } catch (error) {
    logActionError("user/resend-two-factor-code", error);
    return {
      twoFactorError:
        "Ocorreu um erro inesperado ao tentar reenviar o código de verificação! Por favor, espere 10 segundos e tente novamente.",
    };
  }
};

export { handleResendTwoFactorCode };
