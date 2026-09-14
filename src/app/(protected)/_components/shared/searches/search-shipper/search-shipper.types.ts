interface FetchShipperProps {
  cursor?: string;
  businessId: string;
  signal?: AbortSignal;
}

interface FetchShipperResult {
  data: any[];
  nextCursor: string | null;
  hasMore: boolean;
}

export type { FetchShipperProps, FetchShipperResult };
