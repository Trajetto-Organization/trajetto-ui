"use server";

import { deleteCookies, setCookies } from "../cookies";

interface AuthenticationUserProps {
  token: string;
  refresh_token: string;
}

const handleAuthenticateUser = async ({
  token,
  refresh_token,
}: AuthenticationUserProps) => {
  await Promise.all([
    setCookies({
      cookieName: "tkey",
      value: token,
      sameSite: "lax",
    }),
    setCookies({
      cookieName: "rkey",
      value: refresh_token,
      sameSite: "lax",
    }),
  ]);
};

const handleLogOutUser = async () => {
  await Promise.all([deleteCookies("tkey"), deleteCookies("rkey")]);
};

export { handleAuthenticateUser, handleLogOutUser };
