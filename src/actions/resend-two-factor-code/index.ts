"use server";

import { resendTwoFactorCodeSchema } from "@/schemas/resend-two-factor-code-schema";

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
    const response = await fetch(resendTwoFactorCode, {
      credentials: "include",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    const { message } = (await response.json()) as ResendTwoFactorProps;

    if (!response.ok && message) {
      return {
        twoFactorError: message,
      };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      twoFactorError:
        "Ocorreu um erro inesperado ao tentar reenviar o código de verificação! Por favor, espere 10 segundos e tente novamente.",
    };
  }
};

export { handleResendTwoFactorCode };
