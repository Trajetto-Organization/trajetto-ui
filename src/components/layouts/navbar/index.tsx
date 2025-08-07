import { getCookies } from "@/actions/cookies";

import { parseJwt } from "@/lib/decode-jwt";
import { UserRole } from "@/app/(protected)/_components/dto";

import { NavBarContent } from "./navbar-content";

const Navbar = async (): Promise<JSX.Element> => {
  const token = await getCookies("tkey");
  const decodeJwt = parseJwt(token as string);

  const userRole = decodeJwt?.role as UserRole;
  return <NavBarContent token={token as string} role={userRole} />;
};

export { Navbar };
