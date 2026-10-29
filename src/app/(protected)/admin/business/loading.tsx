import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";
import { BusinessListSkeleton } from "@/app/(protected)/_components/admin/business/skeleton";

/**
 * The page's own shape while Next navigates: the heading is known before
 * anything is fetched, so it is printed, and the rest is the list skeleton.
 */
const Loading = (): JSX.Element => (
  <PageContainer>
    <ProtectedHeading
      title="Empresas"
      description="Gerencie empresas cadastradas, delete, edite e mantenha os dados sempre atualizados."
    />

    <BusinessListSkeleton />
  </PageContainer>
);

export default Loading;
