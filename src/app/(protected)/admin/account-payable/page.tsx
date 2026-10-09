import { Suspense } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { getCookies } from "@/actions/cookies";

import { AccountPayableContent } from "@/features/account-payable/content";
import { AccountPayableSkeleton } from "@/features/account-payable/skeleton";
import { firstParam, hasSelectedBusiness } from "@/features/supplier/lib/scope";

interface AccountPayablePageProps {
  // Every param the URL carries: sort, order and the filters too.
  searchParams: Record<string, string | string[] | undefined>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Contas a pagar",
    description:
      "Registre as contas da operação, a quem se paga e o veículo que carrega o custo, e acompanhe o que está em aberto, vencido e pago.",
  };
}

const AdminAccountPayable = async ({
  searchParams,
}: AccountPayablePageProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  return (
    <PageContainer>
      <ProtectedHeading
        title="Contas a pagar"
        description="Selecione uma empresa para registrar e acompanhar as contas a pagar dela."
      />

      <Suspense
        fallback={
          <AccountPayableSkeleton
            mode="admin"
            hasBusiness={hasSelectedBusiness(
              firstParam(searchParams.businessId),
            )}
          />
        }
      >
        <AccountPayableContent
          mode="admin"
          searchParams={searchParams}
          token={tokenAccess}
        />
      </Suspense>
    </PageContainer>
  );
};

export default AdminAccountPayable;
