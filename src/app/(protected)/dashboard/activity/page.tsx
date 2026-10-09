import { Suspense } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { getCookies } from "@/actions/cookies";

import { ActivityContent } from "@/features/activity/content";
import { ActivitySkeleton } from "@/features/activity/skeleton";

interface ActivityPageProps {
  // Every param the URL carries: view, period, the order and the filters.
  searchParams: Record<string, string | string[] | undefined>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Registro de Atividades",
    description:
      "Acompanhe as criações, edições e exclusões feitas no sistema, com quem as fez e quando.",
  };
}

const DashboardActivity = async ({
  searchParams,
}: ActivityPageProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  return (
    <PageContainer>
      <ProtectedHeading
        title="Registro de Atividades"
        description="Tudo o que foi feito na sua empresa: quem, o quê e quando."
      />

      <Suspense fallback={<ActivitySkeleton />}>
        <ActivityContent
          mode="dashboard"
          searchParams={searchParams}
          token={tokenAccess}
        />
      </Suspense>
    </PageContainer>
  );
};

export default DashboardActivity;
