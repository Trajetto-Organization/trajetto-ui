import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { RoutesSkeleton } from "@/features/routes/skeleton";

/**
 * What a navigation to Rotas shows while the server answers.
 *
 * It used to be `ProtectedTablePageLoading`, which replaces the title and the
 * description with two grey bars and draws a bar of three wide buttons — Rotas
 * has two. The title is known before anything is fetched, so it is printed:
 * a skeleton where a word could be is a worse answer than the word.
 */
const Loading = (): JSX.Element => {
  return (
    <PageContainer>
      <ProtectedHeading
        title="Rotas"
        description="Monte o dia de cada motorista, libere a rota e acompanhe as paradas até o fim."
      />

      <RoutesSkeleton mode="dashboard" />
    </PageContainer>
  );
};

export default Loading;
