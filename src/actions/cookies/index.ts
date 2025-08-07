"use server";

import { cookies } from "next/headers";

interface SetCookiesProps {
  cookieName: string;
  value: string;
  expirationTime?: number;
  sameSite: "lax" | "strict";
}

async function setCookies({
  cookieName,
  expirationTime,
  value,
  sameSite,
}: SetCookiesProps) {
  try {
    const setCookie = cookies();

    const nowInSeconds = Math.floor(Date.now() / 1000);
    const expiresIn = (expirationTime as number) - nowInSeconds;

    setCookie.set(cookieName, value, {
      httpOnly: true,
      secure: true,
      maxAge: expiresIn,
      sameSite: sameSite,
      path: "/",
    });
  } catch (error) {
    throw error;
  }
}

async function deleteCookies(cookieName: string) {
  try {
    const deleteCookie = cookies();
    deleteCookie.delete(cookieName);
  } catch (error) {
    throw error;
  }
}

async function getCookies(cookieName: string) {
  try {
    const getUserCookie = cookies();
    const userCookie = getUserCookie.get(cookieName)?.value;

    return userCookie;
  } catch (error) {
    throw error;
  }
}

export { setCookies, deleteCookies, getCookies };
