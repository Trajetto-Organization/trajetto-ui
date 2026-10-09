import type { UserListSearchMeta } from "./lib/user-rules";

/** One line of GET /user/list-user (and /user/list-master-users), as the table reads it. */
interface UserRow {
  id: string;
  name: string;
  email: string;
  role: "MASTER" | "BUSINESS_ADMIN" | "BUSINESS_USER";
  email_verified: string | null;
  two_factor_enabled: boolean;
  access_revoked: boolean;
  avatar?: string | null;
  businessId: string | null;
  profileAccessId: string | null;
  driverId: string | null;
  profileAccess?: { name: string } | null;
  driver?: { name: string } | null;
  whatsapp_phone?: string | null;
  created_at: string;
  updated_at: string;
}

interface UserListMeta {
  total: number;
  page: number;
  pageSize: number;
  searchMeta?: UserListSearchMeta;
}

export type { UserListMeta, UserRow };
