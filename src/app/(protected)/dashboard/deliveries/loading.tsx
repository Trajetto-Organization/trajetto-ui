import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { DeliveriesSkeleton } from "@/features/deliveries/skeleton";

/**
 * What a tab change shows while the server answers.
 *
 * This is not only the first-visit spinner: every section of Entregas is a
 * URL, so moving from Entregas to Ocorrências is a navigation and this file is
 * what Next paints in the gap. It used to be the generic table skeleton — no
 * selector, no action bar, no strip — so each tab change flashed a different
 * page shape before the real one arrived.
 *
 * The title and the description are the page's own and are not skeletons:
 * they are already known before anything is fetched, and a grey bar where a
 * word could be is a worse answer than the word.
 */
const Loading = (): JSX.Element => {
  return (
    <PageContainer>
      <ProtectedHeading
        title="Entregas"
        description="Acompanhe as entregas da sua operação, cadastre embarcadores e mantenha os tipos de ocorrência sempre atualizados."
      />

      <DeliveriesSkeleton mode="dashboard" />
    </PageContainer>
  );
};

export default Loading;
