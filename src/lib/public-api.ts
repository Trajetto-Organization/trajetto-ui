/**
 * The public endpoints, fetched from the server with no token at all.
 *
 * Deliberately separate from `actions/`: everything there reads the session
 * cookie, and these pages have no session by design. Reaching for `getCookies`
 * on a page a stranger opens would be the first step towards accidentally
 * gating it.
 *
 * `cache: "no-store"` on both. Whether a document still matches its hash, and
 * where a delivery is right now, are the two answers on this whole site that
 * must never come from a cache.
 */
interface PublicResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
}

async function fetchPublic<T>(path: string): Promise<PublicResult<T>> {
  try {
    const response = await fetch(`${process.env.HTTP_REQUEST}${path}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      return { ok: false, status: response.status, data: null };
    }

    const body = (await response.json()) as { data: T };

    return { ok: true, status: response.status, data: body.data };
  } catch (error) {
    return { ok: false, status: 0, data: null };
  }
}

interface ProofVerification {
  intact: boolean;
  storedSha256: string | null;

  summary: {
    recipientName: string;
    city: string;
    uf: string;
    invoiceNumber: string | null;
    carrierName: string;
    deliveredAt: string | null;
    receivedBy: string | null;
    sha256: string;
    generatedAt: string;
    version: number;
  };

  url: string | null;
}

interface TrackingView {
  recipientName: string;
  city: string;
  uf: string;

  status: string;
  statusLabel: string;

  invoiceNumber: string | null;
  code: string | null;

  scheduledDate: string | null;
  deliveredAt: string | null;
  receivedBy: string | null;

  carrierName: string;

  events: Array<{ at: string; title: string; detail: string | null }>;

  proofUrl: string | null;
}

const verifyProof = (token: string) =>
  fetchPublic<ProofVerification>(`/public/verify-proof/${token}`);

const trackDelivery = (token: string) =>
  fetchPublic<TrackingView>(`/public/track/${token}`);

export { fetchPublic, trackDelivery, verifyProof };
export type { ProofVerification, PublicResult, TrackingView };
