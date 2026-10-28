import { Suspense } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { getCookies } from "@/actions/cookies";
import { appEnv } from "@/lib/site";

import {
  readMapTileSettings,
  resolveMapTiles,
} from "@/features/control-tower/lib/map-tiles";
import { readBackgroundTracking } from "@/features/control-tower/lib/tracking-notice";
import { ControlTowerContentSkeleton } from "@/features/control-tower/skeleton";
import { parseTowerView } from "@/features/control-tower/lib/views";
import { ControlTowerViews } from "@/features/control-tower/views";

interface ControlTowerQueryParamsProps {
  /**
   * Every param of the URL: the view (meeting of 14/10/2026) and the open
   * view's own — the occurrences' page, search and filters, a ticket link.
   */
  searchParams: { view?: string; businessId?: string } & Record<
    string,
    string | string[] | undefined
  >;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Torre de Controle",
    description: `
      As rotas do dia com o andamento de cada uma, onde os veículos estão
      agora, as ocorrências, os atendimentos e a auditoria dos comprovantes.`,
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
        description="Onde a operação está agora: as rotas do dia, o mapa, as ocorrências, os atendimentos e a auditoria dos comprovantes."
      />

      {/* In the shape of the view the URL opens (Rotas when it names
          none): Atendimentos used to wait behind Rotas' cards. */}
      <Suspense
        fallback={
          <ControlTowerContentSkeleton
            withSelector={false}
            withTrackingNote={!backgroundTracking}
            view={parseTowerView(
              typeof searchParams.view === "string" ? searchParams.view : null,
            )}
          />
        }
      >
        <ControlTowerViews
          mode="dashboard"
          searchParams={searchParams}
          token={tokenAccess}
          tiles={tiles}
          backgroundTracking={backgroundTracking}
        />
      </Suspense>
    </PageContainer>
  );
};

export default DashboardControlTower;
