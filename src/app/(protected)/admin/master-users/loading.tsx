import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { ListSkeleton } from "@/features/user/skeleton";

/**
 * The title is known before anything is fetched, so it is printed; the rest
 * is the screen's own composition: the actions (no company selector), four
 * cards, two filters and the table.
 */
const Loading = (): JSX.Element => (
  <PageContainer>
    <ProtectedHeading
      title="Usuários Masters"
      description="Gerencie os usuários Masters da plataforma"
    />

    <ListSkeleton scope="admin" selector={false} cards={4} filters={2} />
  </PageContainer>
);

export default Loading;
