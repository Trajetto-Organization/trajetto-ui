"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { headers } from "next/headers";

import { apiForwardingHeaders } from "@/lib/api-forwarding";
import { redirect } from "next/navigation";
import { validateLoginUserFormSchema } from "@/schemas/login-schema";

import { handleAuthenticateUser } from "../user-authentication";
import { UserRole } from "@/app/(protected)/_components/shared/common.types";

import { parseJwt } from "@/lib/decode-jwt";
import { getCookies } from "../../cookies";

import { validateTurnstile } from "../../validate-turnstile";
import { rememberTwoFactorChallenge } from "@/lib/two-factor-challenge";
import { apiFetch } from "@/lib/api-fetch";

interface LogInUserProps {
  message?: string;
  token?: string;
  refresh_token?: string;
  twoFactorVerification?: boolean;
  twoFactorChallenge?: string;
  emailVerification?: boolean;
  role?: string;
}

const handleLoginUser = async (state: any, loginValues: FormData) => {
  const userSession = `${process.env.HTTP_REQUEST}/user/session`;
  const loginValidation = validateLoginUserFormSchema.safeParse({
    email: loginValues.get("email"),
    password: loginValues.get("password"),
  });

  if (loginValidation.error) {
    const formatError = loginValidation.error.flatten();
    return {
      loginError: formatError.fieldErrors,
    };
  }

  if (process.env.NODE_ENV === "production") {
    const turnstileToken = loginValues.get("turnstileToken") as string;
    const turnstileOk = await validateTurnstile(turnstileToken);

    if (!turnstileOk) {
      return {
        loginError: {
          loginErrorMessage: "Falha no desafio de segurança.",
        },
      };
    }
  }

  const { email, password } = loginValidation.data;

  const authenticateUser = {
    email,
    password: password,
  };

  let loggedIn: boolean = false;
  let userLoggedRole = "user" as UserRole;

  try {
    const response = await apiFetch(userSession, {
      credentials: "include",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Anonymous route limited per address: say which browser this is for.
        ...apiForwardingHeaders(headers()),
      },
      body: JSON.stringify(authenticateUser),
    });

    const {
      message,
      token,
      refresh_token,
      twoFactorVerification,
      twoFactorChallenge,
      role,
      emailVerification,
    } = (await response.json()) as LogInUserProps;

    if (!response.ok) {
      return {
        loginError: {
          loginErrorMessage: message || refusalMessage(response.status),
        },
      };
    }

    if (emailVerification && message) {
      return { emailVerification: message };
    }

    if (twoFactorVerification && message) {
      // Proof of the password for the code step, kept server-side in an
      // HttpOnly cookie: the browser never gets the value.
      rememberTwoFactorChallenge(twoFactorChallenge);

      return { twoFactor: true, twoFactorEmail: email };
    }

    if (!emailVerification && !twoFactorVerification) {
      await handleAuthenticateUser({
        token: token as string,
        refresh_token: refresh_token as string,
      });

      loggedIn = true;
      userLoggedRole = role as UserRole;

      return;
    }
  } catch (error) {
    logActionError("user/login-user", error);
    return {
      loginError: {
        loginErrorMessage: "Ocorreu um erro inesperado ao tentar fazer login.",
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

export { handleLoginUser };
