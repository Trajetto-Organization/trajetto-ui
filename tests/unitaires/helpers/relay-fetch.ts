import { vi } from "vitest";

/**
 * `fetch` for the screens' relay reads (src/lib/relay-read).
 *
 * The reads that were Server Actions go to `/api/relay/<API path>` now, so a
 * test answers them by API path instead of mocking an action module. Each
 * handler gets the parsed URL (query included) and answers a body — JSON by
 * default — or a whole Response (a refusal, an NDJSON list). A path with no
 * handler answers 404, so a read the test did not expect fails loudly.
 */
type RelayReply = unknown;
type RelayHandler = (
  url: URL,
  init?: RequestInit,
) => RelayReply | Promise<RelayReply>;

interface RelayCall {
  /** The API path, without the `/api/relay` prefix. */
  path: string;
  query: URLSearchParams;
  signal: AbortSignal | null;
}

function relayPathOf(input: RequestInfo | URL): URL {
  const raw =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;

  return new URL(raw, "http://localhost");
}

function stubRelay(
  routes: Record<string, RelayHandler> | Array<[string | RegExp, RelayHandler]>,
) {
  const table = Array.isArray(routes) ? routes : Object.entries(routes);
  const calls: RelayCall[] = [];

  const fetchMock = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = relayPathOf(input);
      const path = url.pathname.replace(/^\/api\/relay/, "");

      calls.push({
        path,
        query: url.searchParams,
        signal: init?.signal ?? null,
      });

      const entry = table.find(([pattern]) =>
        typeof pattern === "string" ? pattern === path : pattern.test(path),
      );

      if (!entry) {
        return Response.json(
          { code: "NOT_STUBBED", message: `relay read not stubbed: ${path}` },
          { status: 404 },
        );
      }

      const reply = await entry[1](url, init);

      return reply instanceof Response ? reply : Response.json(reply);
    },
  );

  vi.stubGlobal("fetch", fetchMock);

  return {
    fetch: fetchMock,
    calls,
    /** The calls made to one API path. */
    callsTo: (path: string) => calls.filter((call) => call.path === path),
  };
}

/** An NDJSON list, as the API's list routes stream it. */
function ndjson(meta: unknown, rows: unknown[]): Response {
  const lines = [
    JSON.stringify({ meta }),
    ...rows.map((row) => JSON.stringify(row)),
  ];

  return new Response(`${lines.join("\n")}\n`, {
    headers: { "content-type": "application/x-ndjson" },
  });
}

/** An API refusal, with its status and code. */
function refusal(
  status: number,
  body: { code?: string; message?: string } = {},
): Response {
  return Response.json(body, {
    status,
    headers: body.code ? { "x-error-code": body.code } : undefined,
  });
}

export { stubRelay, ndjson, refusal };
export type { RelayCall, RelayHandler };
