import { Suspense } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";

import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";
import { ProtectedStatsContentLoading } from "@/app/(protected)/_components/loading-page/protected-stats-content-loading";

import { getCookies } from "@/actions/cookies";

import { AccountPayableActions } from "./page-actions";
import { AccountPayableContent } from "./account-payable-content";

interface AccountPayableQueryParamsProps {
  searchParams: { page?: string; pageSize?: string; search?: string };
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Contas a pagar",
    description: `
      Gerencie de forma segura e intuitiva as contas a pagar de sua empresa.
      Visualize, crie e edite privilégios para manter o controle total do sistema.`,
  };
}

const AccountPayable = async ({
  searchParams,
}: AccountPayableQueryParamsProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  return (
    <PageContainer>
      <ProtectedHeading
        title={"Contas a pagar"}
        description="Cadastre, monitore e gerencie suas contas a pagar."
      />

      <AccountPayableActions />
      <Suspense fallback={<ProtectedStatsContentLoading />}>
        <AccountPayableContent
          searchParams={searchParams}
          token={tokenAccess}
        />
      </Suspense>
    </PageContainer>
  );
};

export default AccountPayable;
