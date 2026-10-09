import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";
import { QuoteListSkeleton } from "@/app/(protected)/_components/admin/quote/skeleton";

/**
 * The page's own shape while Next navigates: the heading is known before
 * anything is fetched, so it is printed, and the rest is the list skeleton.
 */
const Loading = (): JSX.Element => (
  <PageContainer>
    <ProtectedHeading
      title="Orçamentos"
      description="Gerencie todas as solicitações de orçamento e acompanhe o processo de vendas."
    />

    <QuoteListSkeleton />
  </PageContainer>
);

export default Loading;
