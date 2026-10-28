// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { POST as cspReport } from "@/app/api/csp-report/route";

/**
 * What the CSP report endpoint writes to the logs, and what it reads first.
 *
 * The report carries the page and the blocked URL in full. Two of the pages
 * with a per-request nonce are the public tracking and proof links, whose
 * PATH is the bearer token (/acompanhar/<token>, /verificar/<token>), and
 * next-themes' inline script reports on every one of them while the policy is
 * Report-Only. A blocked presigned URL carries its signature in the query.
 * Dropping the query string of the page was not enough: the logs would
 * collect a working tracking link per visit.
 *
 * The endpoint is anonymous, so it also must not buffer a body of any size
 * just because the client left out Content-Length.
 */
const TOKEN =
  "3f9c2b7e41d8a0c65e2f9b1d7a4c8e0f3b6d9a2c5e8f1b4d7a0c3e6f9b2d5a8c";

function report(body: BodyInit, init: RequestInit = {}) {
  return new Request("https://app.test/api/csp-report", {
    method: "POST",
    headers: { "content-type": "application/csp-report" },
    body,
    ...init,
  } as RequestInit);
}

function logged(): string {
  const log = vi.mocked(console.error);

  return JSON.stringify(log.mock.calls);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the logged violation", () => {
  it.each([
    ["tracking", `https://www.intrajetto.com/acompanhar/${TOKEN}`],
    ["opt-out", `https://www.intrajetto.com/acompanhar/${TOKEN}/parar`],
    ["proof", `https://www.intrajetto.com/verificar/${TOKEN}`],
  ])("never carries the token in the %s page's path", async (_page, url) => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await cspReport(
      report(
        JSON.stringify({
          "csp-report": {
            "document-uri": url,
            "effective-directive": "script-src-elem",
            "blocked-uri": "inline",
          },
        }),
      ),
    );

    expect(response.status).toBe(204);
    expect(logged()).toContain("script-src-elem");
    expect(logged()).not.toContain(TOKEN);

    // The page is still recognisable, which is what calibration needs.
    expect(logged()).toMatch(/\/(acompanhar|verificar)\//);
  });

  it("never carries a presigned URL's signature", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    await cspReport(
      report(
        JSON.stringify([
          {
            type: "csp-violation",
            body: {
              documentURL: "https://www.intrajetto.com/dashboard",
              effectiveDirective: "img-src",
              blockedURL:
                "https://acct.r2.cloudflarestorage.com/trajetto/avatars/u1.jpg?X-Amz-Credential=AKIAEXAMPLE&X-Amz-Signature=deadbeefcafe",
            },
          },
        ]),
        { headers: { "content-type": "application/reports+json" } },
      ),
    );

    expect(logged()).toContain("acct.r2.cloudflarestorage.com");
    expect(logged()).not.toContain("deadbeefcafe");
    expect(logged()).not.toContain("AKIAEXAMPLE");
  });

  // The Trusted Types policy is Report-Only: its lines must not read like a
  // block, or an observation would be chased as a broken page.
  it.each([
    [
      "report-uri",
      {
        "csp-report": {
          "document-uri": "https://www.intrajetto.com/dashboard",
          "effective-directive": "require-trusted-types-for",
          "blocked-uri": "trusted-types-sink",
          disposition: "report",
        },
      },
    ],
    [
      "Reporting API",
      [
        {
          type: "csp-violation",
          body: {
            documentURL: "https://www.intrajetto.com/dashboard",
            effectiveDirective: "require-trusted-types-for",
            blockedURL: "trusted-types-sink",
            disposition: "report",
          },
        },
      ],
    ],
  ])("says when a %s line only reports", async (_format, payload) => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    await cspReport(report(JSON.stringify(payload)));

    expect(logged()).toContain('"disposition":"report"');
  });

  it("calls a report without a disposition enforced", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    await cspReport(
      report(
        JSON.stringify({
          "csp-report": {
            "document-uri": "https://www.intrajetto.com/admin",
            "effective-directive": "script-src",
            "blocked-uri": "inline",
          },
        }),
      ),
    );

    expect(logged()).toContain('"disposition":"enforce"');
  });

  it("keeps the keywords browsers report instead of a URL", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    await cspReport(
      report(
        JSON.stringify({
          "csp-report": {
            "document-uri": "https://www.intrajetto.com/admin",
            "effective-directive": "script-src",
            "blocked-uri": "eval",
          },
        }),
      ),
    );

    expect(logged()).toContain('"eval"');
  });
});

describe("the body it reads", () => {
  it("stops reading an oversized body sent without Content-Length", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    // 1 MB in 1 KB chunks, produced only as they are read.
    let pulled = 0;

    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled += 1;

        if (pulled > 1024) {
          controller.close();
          return;
        }

        controller.enqueue(new Uint8Array(1024).fill(120));
      },
    });

    const response = await cspReport(
      report(body, { duplex: "half" } as RequestInit),
    );

    expect(response.status).toBe(413);
    expect(pulled).toBeLessThan(64);
    expect(vi.mocked(console.error)).not.toHaveBeenCalled();
  });
});
