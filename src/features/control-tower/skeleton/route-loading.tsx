"use client";

import { useSearchParams } from "next/navigation";

import { parseTowerView } from "../lib/views";

import { ControlTowerPageSkeleton } from ".";

/**
 * The Torre's loading.tsx, in the shape of the view being opened. loading.tsx
 * gets no searchParams, and the menu now links to the view this browser
 * chose last (`?view=`): drawn as Rotas, the wait showed six cards and then
 * jumped to a map or a ticket list. The URL is already the new one while
 * this shows.
 */
const ControlTowerRouteLoading = ({
  withSelector,
}: {
  withSelector: boolean;
}): JSX.Element => {
  const params = useSearchParams();

  return (
    <ControlTowerPageSkeleton
      withSelector={withSelector}
      view={parseTowerView(params.get("view"))}
    />
  );
};

export { ControlTowerRouteLoading };
