interface FetchAccountPayableByResponsibleUserProps {
  cursor?: string;
  signal?: AbortSignal;
}

interface FetchAccountPayableByResponsibleUserResult {
  data: any[];
  nextCursor: string | null;
  hasMore: boolean;
}

export type {
  FetchAccountPayableByResponsibleUserProps,
  FetchAccountPayableByResponsibleUserResult,
};
