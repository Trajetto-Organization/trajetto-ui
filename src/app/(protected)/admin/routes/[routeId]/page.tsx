import { Suspense } from "react";
import { Metadata } from "next";

import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { getCookies } from "@/actions/cookies";
import { appEnv } from "@/lib/site";

import { RouteDetailContent } from "@/features/routes/detail-page/content";
import { RouteDetailSkeleton } from "@/features/routes/detail-page/skeleton";
import {
  readMapTileSettings,
  resolveMapTiles,
} from "@/features/control-tower/lib/map-tiles";
import { readBackgroundTracking } from "@/features/control-tower/lib/tracking-notice";

interface RouteDetailPageProps {
  params: { routeId: string };
  searchParams: Record<string, string | string[] | undefined>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Rota",
    description:
      "As entregas da rota na ordem do motorista, o mapa das paradas e a liberação.",
  };
}

/**
 * One route (decision 14.7, D12): header, stops in order, the picker of
 * deliveries without a route and the map with the driver's position.
 */
const AdminRouteDetail = async ({
  params,
  searchParams,
}: RouteDetailPageProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) redirect("/login");

  // Per request, on the server: the image is promoted from staging, so the
  // map provider cannot be inlined at build time (decisions 7.3 and 7.4).
  const tiles = resolveMapTiles({ ...readMapTileSettings(), appEnv: appEnv() });
  const backgroundTracking = readBackgroundTracking();

  return (
    <PageContainer>
      <ProtectedHeading
        title="Rota"
        description="Escolha as entregas, defina a sequência e libere para o motorista."
      />

      <Suspense fallback={<RouteDetailSkeleton withSelector={true} />}>
        <RouteDetailContent
          mode="admin"
          routeId={params.routeId}
          searchParams={searchParams}
          token={tokenAccess}
          tiles={tiles}
          backgroundTracking={backgroundTracking}
        />
      </Suspense>
    </PageContainer>
  );
};

export default AdminRouteDetail;
