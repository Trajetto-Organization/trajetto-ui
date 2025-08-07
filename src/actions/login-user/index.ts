"use server";

import { redirect } from "next/navigation";
import { validateLoginUserFormSchema } from "@/schemas/login-schema";

import { handleAuthenticateUser } from "../user-authentication";
import { UserRole } from "@/app/(protected)/_components/dto";

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
      if (userLoggedRole.startsWith("MASTER")) {
        redirect(`/admin`);
      }

      redirect(`/dashboard`);
    }
  }
};

export { handleLoginUser };
