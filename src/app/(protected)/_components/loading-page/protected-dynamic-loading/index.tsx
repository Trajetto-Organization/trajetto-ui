import { getCookies } from "@/actions/cookies";
import { parseJwt } from "@/lib/decode-jwt";

import { ProtectedPageLoading } from "../protected-page-loading";

interface ProtectedDynamicLoadingProps {
  /** The sidebar state the person left; see ProtectedPageLoading. */
  sidebarOpen?: boolean;
}

const ProtectedDynamicLoading = async ({
  sidebarOpen = true,
}: ProtectedDynamicLoadingProps = {}): Promise<JSX.Element> => {
  const token = await getCookies("tkey");
  const decodeJwt = parseJwt(token as string);

  const role = decodeJwt?.role;
  const driverId = decodeJwt?.driverId;

  // A driver's shell is the office's, with the driver's own menu (decision
  // 4.8): same sidebar, same collapsed rail, same header.
  const isDriver = role === "BUSINESS_USER" && !!driverId;

  return (
    <ProtectedPageLoading
      sidebarOpen={sidebarOpen}
      surface={isDriver ? "driver" : "dashboard"}
    />
  );
};

export { ProtectedDynamicLoading };
