import type { CatalogLeader } from "@/lib/catalog-stats";

/** One line of GET /profile-access/list-profile-access, as the table reads it. */
interface ProfileAccessRow {
  id: string;
  name: string;
  businessId: string;
  /** Users linked to the profile: a profile in use cannot be deleted. */
  usersCount: number;
  permissionsCount: number;
  created_at: string;
  updated_at: string;
}

/**
 * The cards' numbers (`meta.searchMeta`), counted by the API over the
 * company's whole search: profile-access-list.ts summarizeProfileList.
 */
interface ProfileAccessListSearchMeta {
  total: number;
  linkedUsers: number;
  withoutUsers: number;
  mostUsed: CatalogLeader | null;
}

interface ProfileAccessListMeta {
  total: number;
  page: number;
  pageSize: number;
  searchMeta?: ProfileAccessListSearchMeta;
}

export type {
  ProfileAccessListMeta,
  ProfileAccessListSearchMeta,
  ProfileAccessRow,
};
