import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { AccountPayableSkeleton } from "@/features/account-payable/skeleton";

/**
 * The page's own shape while Next navigates: the heading is known before
 * anything is fetched, so it is printed, and the rest is the list skeleton.
 */
const Loading = (): JSX.Element => (
  <PageContainer>
    <ProtectedHeading
      title="Contas a pagar"
      description="Cadastre, monitore e gerencie suas contas a pagar."
    />

    <AccountPayableSkeleton mode="dashboard" />
  </PageContainer>
);

export default Loading;
