// Not "use server": that would make these callable from the browser, and a
// script could then write a session of its choosing. The login, two-factor
// and logout actions call them on the server.
import "server-only";

import { clearSessionCookies, setSessionCookies } from "@/lib/session-cookies";

interface AuthenticationUserProps {
  token: string;
  refresh_token: string;
}

const handleAuthenticateUser = async ({
  token,
  refresh_token,
}: AuthenticationUserProps) => {
  // Both cookies last as long as the refresh token. The expiration used to be
  // an argument nobody passed, which made it `Max-Age=NaN`.
  setSessionCookies({ token, refresh_token });
};

const handleLogOutUser = async () => {
  clearSessionCookies();
};

export { handleAuthenticateUser, handleLogOutUser };
