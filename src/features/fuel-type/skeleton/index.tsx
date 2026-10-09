import { CatalogListSkeleton } from "@/components/shared/custom/catalog-list-skeleton";

/**
 * Tipos de combustível before the server answers: the selector on /admin,
 * Atualizar and Criar, the three cards, the search, the table. Hook-free:
 * `loading.tsx` renders it on the server.
 */
const FuelTypeSkeleton = ({
  mode,
  hasCompany,
}: {
  mode: "admin" | "dashboard";
  /** On /admin, whether the URL names a company (see CatalogListSkeleton). */
  hasCompany?: boolean;
}): JSX.Element => (
  <CatalogListSkeleton mode={mode} columns={6} hasCompany={hasCompany} />
);

export { FuelTypeSkeleton };
