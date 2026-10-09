import { Suspense } from "react";
import { Metadata } from "next";

import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { getCookies } from "@/actions/cookies";

import { DriverPausesContent } from "@/features/driver-pauses/content";
import { DriverPausesSkeleton } from "@/features/driver-pauses/skeleton";

interface DriverPausesPageProps {
  // Every param Next passes (period, filters, page); the content reads what
  // it needs.
  searchParams: Record<string, string | string[] | undefined>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Pausas dos motoristas",
    description:
      "Pausas dos motoristas de qualquer empresa da plataforma, com os alertas da Lei 13.103/2015.",
  };
}

const AdminDriverPauses = async ({
  searchParams,
}: DriverPausesPageProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) redirect("/login");

  return (
    <PageContainer>
      <ProtectedHeading
        title="Pausas dos motoristas"
        description="Selecione uma empresa para ver as pausas dos motoristas, dia a dia, com os alertas da Lei 13.103/2015."
      />

      {/* loading.tsx covers the segment while Next navigates; this covers
      only the async content, so the heading paints at once. */}
      <Suspense fallback={<DriverPausesSkeleton mode="admin" />}>
        <DriverPausesContent
          mode="admin"
          searchParams={searchParams}
          token={tokenAccess}
        />
      </Suspense>
    </PageContainer>
  );
};

export default AdminDriverPauses;
