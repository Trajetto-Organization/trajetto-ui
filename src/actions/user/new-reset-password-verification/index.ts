"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { apiFetch } from "@/lib/api-fetch";
import { apiForwardingHeaders } from "@/lib/api-forwarding";
import { headers } from "next/headers";

interface SubscriptionVerificationProps {
  message: string;
}

const newResetPasswordVerification = async (token: string) => {
  // A server action takes whatever its caller sends: unencoded, a "token"
  // like `x&other=1` added parameters of the caller's choosing to the API call.
  if (typeof token !== "string" || !token) {
    return { error: { errorMessage: "Token ausente!" } };
  }

  const subscriptionVerification = `${process.env.HTTP_REQUEST}/user/forgot-verification?token=${encodeURIComponent(token)}`;

  try {
    const response = await apiFetch(subscriptionVerification, {
      credentials: "include",
      method: "GET",
      // Anonymous route limited per address: say which browser this is for.
      headers: apiForwardingHeaders(headers()),
    });

    const { message } =
      (await response.json()) as SubscriptionVerificationProps;

    if (!response.ok) {
      return {
        error: { errorMessage: message || refusalMessage(response.status) },
      };
    }
  } catch (error) {
    logActionError("user/new-reset-password-verification", error);
    return {
      error: {
        errorMessage:
          "Ocorreu um erro inesperado ao tentar verificar sua senha.",
      },
    };
  }
};

export { newResetPasswordVerification };
