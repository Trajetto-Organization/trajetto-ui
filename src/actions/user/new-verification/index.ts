"use server";

import { logActionError } from "@/lib/log-action-error";
import { headers } from "next/headers";

import { apiForwardingHeaders } from "@/lib/api-forwarding";
import { refusalMessage } from "@/lib/api-error";
import { apiFetch } from "@/lib/api-fetch";

interface EmailVerificationProps {
  message?: string;
}

const VERIFIED_FALLBACK = "E-mail verificado com sucesso!";

const newVerification = async (token: string) => {
  const emailVerification = `${process.env.HTTP_REQUEST}/user/email-verification?token=${encodeURIComponent(token)}`;

  try {
    const response = await apiFetch(emailVerification, {
      credentials: "include",
      method: "POST",
      // Anonymous route limited per address: say which browser this is for.
      headers: apiForwardingHeaders(headers()),
    });

    const { message } = (await response.json()) as EmailVerificationProps;

    // Decided by the status alone: a 200 without a message is still a
    // verified e-mail, and a refusal without one still needs a sentence (the
    // screen showed nothing and never left the spinner).
    if (response.ok) {
      return { successMessage: message || VERIFIED_FALLBACK };
    }

    return {
      error: { errorMessage: message || refusalMessage(response.status) },
    };
  } catch (error) {
    logActionError("user/new-verification", error);
    return {
      error: {
        errorMessage:
          "Ocorreu um erro inesperado ao tentar verificar o e-mail.",
      },
    };
  }
};

export { newVerification };
