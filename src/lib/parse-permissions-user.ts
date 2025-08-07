import { getCookies } from "@/actions/cookies";
import { parseJwt } from "./decode-jwt";

import { PermissionKey } from "@/app/(protected)/_components/dto";

interface PermissionData {
  permissionKey: PermissionKey;
  canRead: boolean;
  canWrite: boolean;
}

const parsePermissionsUser = async (): Promise<PermissionData[]> => {
  const token = await getCookies("tkey");
  const decoded = parseJwt(token as string);

  return decoded.permissions;
};

export { parsePermissionsUser };
