interface FetchShipperResult {
  data: any[];
  nextCursor: string | null;
  hasMore: boolean;
}

export type { FetchShipperResult };
