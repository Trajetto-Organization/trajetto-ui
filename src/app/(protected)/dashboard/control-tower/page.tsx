import { Suspense } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { getCookies } from "@/actions/cookies";
import { appEnv } from "@/lib/site";

import { ControlTowerContent } from "@/features/control-tower/content";
import {
  readMapTileSettings,
  resolveMapTiles,
} from "@/features/control-tower/lib/map-tiles";
import { readBackgroundTracking } from "@/features/control-tower/lib/tracking-notice";
import { ControlTowerContentSkeleton } from "@/features/control-tower/skeleton";

interface ControlTowerQueryParamsProps {
  searchParams: { businessId?: string };
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Torre de Controle",
    description: `
      Onde os veículos estão agora, o funil de documentos do dia, a
      pontualidade das saídas e os últimos eventos da operação.`,
  };
}

const DashboardControlTower = async ({
  searchParams,
}: ControlTowerQueryParamsProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  // Per request, on the server: the image is promoted from staging, so the
  // map provider cannot be a value inlined at build time (decision 7.4).
  const tiles = resolveMapTiles({ ...readMapTileSettings(), appEnv: appEnv() });

  // Same reason, same place: turning the app's background tracking on must
  // not need a new web image (decision 7.3).
  const backgroundTracking = readBackgroundTracking();

  return (
    <PageContainer>
      <ProtectedHeading
        title={"Torre de Controle"}
        description="Onde os veículos estão agora e como o dia está andando."
      />

      <Suspense
        fallback={
          <ControlTowerContentSkeleton
            withSelector={false}
            withTrackingNote={!backgroundTracking}
          />
        }
      >
        <ControlTowerContent
          mode="dashboard"
          searchParams={searchParams}
          tiles={tiles}
          backgroundTracking={backgroundTracking}
        />
      </Suspense>
    </PageContainer>
  );
};

export default DashboardControlTower;
