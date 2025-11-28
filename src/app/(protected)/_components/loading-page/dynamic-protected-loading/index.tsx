import { getCookies } from "@/actions/cookies";
import { parseJwt } from "@/lib/decode-jwt";

import { ProtectedPageLoading } from "../protected-page-loading";
import { ProtectedDriverPageLoading } from "../protected-driver-page-loading";

const DynamicProtectedLoading = async (): Promise<JSX.Element> => {
  const token = await getCookies("tkey");
  const decodeJwt = parseJwt(token as string);

  const role = decodeJwt?.role;
  const driverId = decodeJwt?.driverId;

  // Determine if user is a driver
  const isDriver = role === "BUSINESS_USER" && !!driverId;

  if (isDriver) {
    return <ProtectedDriverPageLoading />;
  }

  return <ProtectedPageLoading />;
};

export { DynamicProtectedLoading };
