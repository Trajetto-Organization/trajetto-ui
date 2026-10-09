/**
 * Headers that tell the API which browser a server-side call is made for.
 *
 * Login, two-factor, password recovery, e-mail verification, refresh and the
 * public tracking pages call the API from THIS server — a Server Action, the
 * middleware or a Server Component — not from the browser. The API limits
 * those anonymous routes per address, and every one of those calls arrived
 * from this server's address: eight logins a minute for all web users
 * together, and a refresh budget ordinary traffic used up, logging people out.
 *
 * The browser's address goes along with a secret shared only with the API
 * (RATE_LIMIT_FORWARDER_SECRET, the same value on both sides). The API ignores
 * the address without the secret, so nobody else can choose their own bucket.
 *
 * Server-only by construction: the secret is not a NEXT_PUBLIC_ variable, so
 * it is never inlined into a browser bundle, and without it this returns
 * nothing.
 */
const CLIENT_IP_HEADER = "x-trajetto-client-ip";
const FORWARDER_SECRET_HEADER = "x-trajetto-forwarder-secret";

/**
 * Behind Cloudflare, the peer above is a Cloudflare edge that thousands of
 * users share, and the browser's own address is in CF-Connecting-IP. Both go
 * along RAW: the API believes the Cloudflare value only when the relayed peer
 * is one of Cloudflare's ranges (and, when it has RATE_LIMIT_EDGE_SECRET, only
 * next to the header our zone adds), under the same rule it applies to a
 * request that reaches it directly. No range list lives here.
 */
const CLIENT_EDGE_IP_HEADER = "x-trajetto-client-edge-ip";
const CLIENT_EDGE_SECRET_HEADER = "x-trajetto-client-edge-secret";

/**
 * The browser's address as the reverse proxy in front of this app saw it.
 *
 * The LAST entry of X-Forwarded-For: Traefik appends the real peer at the end,
 * and anything before it is whatever the client chose to write.
 */
function browserAddress(source: Headers): string | null {
  const forwarded = source.get("x-forwarded-for");

  if (forwarded) {
    const hops = forwarded
      .split(",")
      .map((hop) => hop.trim())
      .filter(Boolean);

    if (hops.length > 0) return hops[hops.length - 1];
  }

  return source.get("x-real-ip");
}

function apiForwardingHeaders(source: Headers): Record<string, string> {
  const secret = process.env.RATE_LIMIT_FORWARDER_SECRET;
  const address = browserAddress(source);

  if (!secret || !address) return {};

  const edgeClient = source.get("cf-connecting-ip")?.trim();
  const edgeSecret = source.get("x-trajetto-edge-secret");

  return {
    [CLIENT_IP_HEADER]: address,
    [FORWARDER_SECRET_HEADER]: secret,
    ...(edgeClient ? { [CLIENT_EDGE_IP_HEADER]: edgeClient } : {}),
    ...(edgeSecret ? { [CLIENT_EDGE_SECRET_HEADER]: edgeSecret } : {}),
  };
}

export {
  CLIENT_EDGE_IP_HEADER,
  CLIENT_EDGE_SECRET_HEADER,
  CLIENT_IP_HEADER,
  FORWARDER_SECRET_HEADER,
  apiForwardingHeaders,
  browserAddress,
};
