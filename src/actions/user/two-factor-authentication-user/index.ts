"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { headers } from "next/headers";

import { apiForwardingHeaders } from "@/lib/api-forwarding";
import { redirect } from "next/navigation";

import { validateTwoFactorUserFormSchema } from "@/schemas/two-factor-schema";
import { handleAuthenticateUser } from "../user-authentication";

import { UserRole } from "@/app/(protected)/_components/shared/common.types";
import { parseJwt } from "@/lib/decode-jwt";

import { getCookies } from "../../cookies";
import {
  forgetTwoFactorChallenge,
  twoFactorChallengeField,
} from "@/lib/two-factor-challenge";
import { apiFetch } from "@/lib/api-fetch";

interface TwoFactorProps {
  message: string;
  token: string;
  refresh_token: string;
  role: string;
}

const handleTwoFactorAuthenticationUser = async (
  state: any,
  twoFactorValues: FormData,
) => {
  const twoFactorValidation = validateTwoFactorUserFormSchema.safeParse({
    code: twoFactorValues.get("code"),
  });

  if (twoFactorValidation.error) {
    const formatError = twoFactorValidation.error.flatten();

    return {
      twoFactorError: formatError.fieldErrors,
    };
  }

  const { code } = twoFactorValidation.data;
  const email = twoFactorValues.get("email");

  const twoFactor = `${process.env.HTTP_REQUEST}/user/two-factor-verification`;

  const twoFactorVerificationUser = {
    email,
    code,
    // What the password step returned; absent against an older API, and
    // then the body is exactly what it always was.
    ...twoFactorChallengeField(),
  };

  let loggedIn: boolean = false;
  let userLoggedRole = "user" as UserRole;

  try {
    const response = await apiFetch(twoFactor, {
      credentials: "include",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Anonymous route limited per address: say which browser this is for.
        ...apiForwardingHeaders(headers()),
      },
      body: JSON.stringify(twoFactorVerificationUser),
    });

    const { message, token, refresh_token, role } =
      (await response.json()) as TwoFactorProps;

    if (!response.ok) {
      return {
        twoFactorError: {
          twoFactorErrorMessage: message || refusalMessage(response.status),
        },
      };
    }

    await handleAuthenticateUser({
      token,
      refresh_token,
    });

    // Spent: the code step is over.
    forgetTwoFactorChallenge();

    loggedIn = true;
    userLoggedRole = role as UserRole;

    return;
  } catch (error) {
    logActionError("user/two-factor-authentication-user", error);
    return {
      twoFactorError: {
        twoFactorErrorMessage:
          "Ocorreu um erro inesperado ao tentar a autenticação de dois fatores.",
      },
    };
  } finally {
    if (loggedIn) {
      // MASTER users → /admin
      if (userLoggedRole.startsWith("MASTER")) {
        redirect(`/admin`);
      }

      // BUSINESS_USER: check if driver using JWT
      if (userLoggedRole === "BUSINESS_USER") {
        const tokenCookie = await getCookies("tkey");
        const decodedToken = tokenCookie ? parseJwt(tokenCookie) : null;

        // If has driverId in JWT → driver → /profile
        if (decodedToken?.driverId) {
          redirect(`/profile`);
        }
      }

      // Default redirect for employees and BUSINESS_ADMIN
      redirect(`/dashboard`);
    }
  }
};

export { handleTwoFactorAuthenticationUser };
