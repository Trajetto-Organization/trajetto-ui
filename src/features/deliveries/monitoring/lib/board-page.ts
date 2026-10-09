/**
 * Which page of the board by route to show after a read (DLVP-MON-1).
 *
 * The page is local state and the list moves under it: a route cancelled
 * while the dispatcher is on the last page leaves that page empty, and an
 * empty page read as "Nenhuma rota hoje" with no pager to go back — while
 * twenty routes existed. Past the end, the last page that has routes.
 *
 * Only a read OF this page decides: while the next page loads, the previous
 * one is still on screen (keepPreviousData) and says nothing about it.
 */
function settledBoardPage(
  page: number,
  meta: { page: number; pageSize: number; total: number } | undefined,
): number {
  if (!meta || meta.page !== page) return page;

  const last = Math.max(1, Math.ceil(meta.total / Math.max(1, meta.pageSize)));

  return page > last ? last : page;
}

export { settledBoardPage };
