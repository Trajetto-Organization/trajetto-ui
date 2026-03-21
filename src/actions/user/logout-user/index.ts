"use server";

import { redirect } from "next/navigation";
import { handleLogOutUser } from "../user-authentication";

const handleLogout = async () => {
  let loggedOut: boolean = false;

  try {
    await handleLogOutUser();
    loggedOut = true;
  } catch (error) {
    return {
      logoutError:
        "Ocorreu um erro inesperado ao tentar fazer o log out! Por favor, tente novamente.",
    };
  } finally {
    if (loggedOut) {
      redirect("/login?reason=logout");
    }
  }
};

export { handleLogout };
