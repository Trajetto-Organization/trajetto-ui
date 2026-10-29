import { Suspense } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { getCookies } from "@/actions/cookies";

import { BranchContent } from "@/features/branch/content";
import { BranchListSkeleton } from "@/features/branch/skeleton";

interface BranchPageProps {
  // Every param the URL carries: sort, order and the facets too.
  searchParams: Record<string, string | string[] | undefined>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Filiais",
    description:
      "Cadastre e acompanhe as unidades regionais da empresa: endereço, contato, código ERP e situação.",
  };
}

const AdminBranch = async ({
  searchParams,
}: BranchPageProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  return (
    <PageContainer>
      <ProtectedHeading
        title="Filiais"
        description="Selecione uma empresa para cadastrar e acompanhar as filiais dela."
      />

      <Suspense fallback={<BranchListSkeleton mode="admin" />}>
        <BranchContent
          mode="admin"
          searchParams={searchParams}
          token={tokenAccess}
        />
      </Suspense>
    </PageContainer>
  );
};

export default AdminBranch;
