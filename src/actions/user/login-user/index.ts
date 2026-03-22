"use server";

import { redirect } from "next/navigation";
import { validateLoginUserFormSchema } from "@/schemas/login-schema";

import { handleAuthenticateUser } from "../user-authentication";
import { UserRole } from "@/app/(protected)/_components/shared/common.types";

import { parseJwt } from "@/lib/decode-jwt";
import { getCookies } from "../../cookies";

import { validateTurnstile } from "../../validate-turnstile";

interface LogInUserProps {
  message?: string;
  token?: string;
  refresh_token?: string;
  twoFactorVerification?: boolean;
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
    const response = await fetch(userSession, {
      credentials: "include",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(authenticateUser),
    });

    const {
      message,
      token,
      refresh_token,
      twoFactorVerification,
      role,
      emailVerification,
    } = (await response.json()) as LogInUserProps;

    if (!response.ok && message) {
      return {
        loginError: { loginErrorMessage: message },
      };
    }

    if (emailVerification && message) {
      return { emailVerification: message };
    }

    if (twoFactorVerification && message) {
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
