import type { PermissionListSearchMeta } from "./lib/permission-rules";

/** One line of GET /permission/list-permission, as the table reads it. */
interface PermissionRow {
  id: string;
  /** The permission's own name ("Nome da permissão"). */
  action: string;
  /** The resource it grants (lib/permissions key). */
  permissionKey: string;
  canRead: boolean;
  canWrite: boolean;
  businessId: string;
  profileAccessId: string;
  profileAccess: { name: string };
  created_at: string;
  updated_at: string;
}

interface PermissionListMeta {
  total: number;
  page: number;
  pageSize: number;
  searchMeta?: PermissionListSearchMeta;
}

export type { PermissionListMeta, PermissionRow };
