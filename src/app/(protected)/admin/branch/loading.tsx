import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { BranchListSkeleton } from "@/features/branch/skeleton";

/**
 * The page's own shape while Next navigates: the heading is known before
 * anything is fetched, so it is printed, and the rest is the list skeleton.
 */
const Loading = (): JSX.Element => (
  <PageContainer>
    <ProtectedHeading
      title="Filiais"
      description="Selecione uma empresa para cadastrar e acompanhar as filiais dela."
    />

    <BranchListSkeleton mode="admin" />
  </PageContainer>
);

export default Loading;
