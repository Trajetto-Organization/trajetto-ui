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
import { headers } from "next/headers";

import { apiForwardingHeaders } from "@/lib/api-forwarding";
import { isPublicToken } from "@/lib/public-token";

interface PublicResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
}

async function fetchPublic<T>(path: string): Promise<PublicResult<T>> {
  try {
    const response = await fetch(`${process.env.HTTP_REQUEST}${path}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        // The API limits these pages per address, and every visitor reached it
        // from this server's: say which visitor this is for.
        ...apiForwardingHeaders(headers()),
      },
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

    /**
     * The carrier's zone (Business.timezone), for the times on the page.
     * Optional: an older API answered without it.
     */
    timeZone?: string;

    /**
     * What was recorded about the ICP-Brasil signature (decision 14.8): no
     * serial, no CNPJ. Optional: an older API answered without it, and such
     * a document was never signed.
     */
    signature?: {
      status: "SIGNED" | "UNSIGNED";
      profile: "PADES_AD_RB" | "CMS_DETACHED" | null;
      signerName: string | null;
      certNotAfter: string | null;
      signedAt: string | null;
    };
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

  /** The carrier's zone, for the times on the page; absent on older APIs. */
  timeZone?: string;
}

/**
 * Whether a failed answer says the thing does not exist — or only that it
 * could not be checked right now.
 *
 * The pages used to read every failure as the first. A rate-limited minute, a
 * deploy, a network blip, and a recipient scanning the QR of a GENUINE proof
 * was told it matched no document at all; a tracking link said it matched no
 * delivery. The API answers 404 for an unknown token and 400 for a malformed
 * one; everything else is "try again".
 */
function isDenial(result: PublicResult<unknown>): boolean {
  return result.status === 404 || result.status === 400;
}

/**
 * What the API itself answers a malformed token, without asking it: the token
 * becomes a path segment, and `..` in it would reach another route entirely.
 */
function malformedToken<T>(): Promise<PublicResult<T>> {
  return Promise.resolve({ ok: false, status: 400, data: null });
}

const verifyProof = (token: string) =>
  isPublicToken(token)
    ? fetchPublic<ProofVerification>(`/public/verify-proof/${token}`)
    : malformedToken<ProofVerification>();

const trackDelivery = (token: string) =>
  isPublicToken(token)
    ? fetchPublic<TrackingView>(`/public/track/${token}`)
    : malformedToken<TrackingView>();

export { fetchPublic, isDenial, trackDelivery, verifyProof };
export type { ProofVerification, PublicResult, TrackingView };
