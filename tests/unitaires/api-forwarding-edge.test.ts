// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { apiForwardingHeaders } from "@/lib/api-forwarding";

/**
 * What the web server relays about the browser, behind Cloudflare.
 *
 * Production is Cloudflare -> Traefik -> this server. The last
 * X-Forwarded-For entry, which is what gets relayed as the browser's address,
 * is therefore the Cloudflare EDGE that served the browser — thousands of
 * users share it, so every web login from one edge landed in one API bucket.
 * The real browser address is in CF-Connecting-IP. It is relayed raw, and
 * the API believes it only when the relayed peer is a Cloudflare edge (and,
 * when the API has RATE_LIMIT_EDGE_SECRET, only next to our zone's header),
 * so this server needs no knowledge of Cloudflare's ranges.
 */
const SECRET = "s".repeat(40);

beforeEach(() => {
  process.env.RATE_LIMIT_FORWARDER_SECRET = SECRET;
});

afterEach(() => {
  delete process.env.RATE_LIMIT_FORWARDER_SECRET;
});

describe("forwarding headers behind Cloudflare", () => {
  it("relay what Cloudflare said about the browser, next to the peer", () => {
    const headers = apiForwardingHeaders(
      new Headers({
        "x-forwarded-for": "172.70.1.1",
        "cf-connecting-ip": "203.0.113.7",
      }),
    );

    expect(headers["x-trajetto-client-ip"]).toBe("172.70.1.1");
    expect(headers["x-trajetto-client-edge-ip"]).toBe("203.0.113.7");
    expect(headers["x-trajetto-forwarder-secret"]).toBe(SECRET);
  });

  it("relay the edge secret our zone added, for the API to check", () => {
    const headers = apiForwardingHeaders(
      new Headers({
        "x-forwarded-for": "172.70.1.1",
        "cf-connecting-ip": "203.0.113.7",
        "x-trajetto-edge-secret": "e".repeat(40),
      }),
    );

    expect(headers["x-trajetto-client-edge-secret"]).toBe("e".repeat(40));
  });

  it("add nothing new when Cloudflare is not in front", () => {
    expect(
      apiForwardingHeaders(new Headers({ "x-forwarded-for": "189.40.1.7" })),
    ).toEqual({
      "x-trajetto-client-ip": "189.40.1.7",
      "x-trajetto-forwarder-secret": SECRET,
    });
  });

  it("relay nothing at all without the shared secret", () => {
    delete process.env.RATE_LIMIT_FORWARDER_SECRET;

    expect(
      apiForwardingHeaders(
        new Headers({
          "x-forwarded-for": "172.70.1.1",
          "cf-connecting-ip": "203.0.113.7",
        }),
      ),
    ).toEqual({});
  });
});
