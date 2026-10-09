import { Suspense } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { getCookies } from "@/actions/cookies";

import { FineContent } from "@/features/fine/content";
import { FineSkeleton } from "@/features/fine/skeleton";
import type { PageSearchParams } from "@/features/fine/lib/server-table";

const DESCRIPTION =
  "Selecione uma empresa para consultar e gerenciar as multas dela.";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Multas",
    description:
      "Consulte e gerencie as multas de qualquer empresa da plataforma.",
  };
}

// Next hands every query param to the page: typed wide so the sort and
// filter params reach the list (table-infra contract).
interface FinePageProps {
  searchParams: PageSearchParams;
}

const AdminFine = async ({
  searchParams,
}: FinePageProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) redirect("/login");

  return (
    <PageContainer>
      <ProtectedHeading title="Multas" description={DESCRIPTION} />

      {/* loading.tsx covers the segment while Next navigates; this one only
      the async content, so the heading paints at once. */}
      <Suspense fallback={<FineSkeleton mode="admin" />}>
        <FineContent
          mode="admin"
          searchParams={searchParams}
          token={tokenAccess}
        />
      </Suspense>
    </PageContainer>
  );
};

export default AdminFine;
