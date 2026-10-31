/*
  Cloudflare Turnstile's siteverify, local, for the browser suites.

  The suites run the web as a production build with Cloudflare's documented
  TEST keys, and the server checks every login's token with siteverify. That
  call went to challenges.cloudflare.com over the internet, so the gate
  failed whenever Cloudflare was slow or unreachable, with nothing wrong in
  the code. The web server is pointed here instead
  (TURNSTILE_SITEVERIFY_URL, honoured only with a test secret:
  src/lib/turnstile-siteverify.ts).

  It answers the way Cloudflare documents its test secrets:
    1x0000000000000000000000000000000AA  passes, for the dummy token only
    2x0000000000000000000000000000000AA  always fails
    3x0000000000000000000000000000000AA  "token already spent"
  and refuses any other secret: a real one never belongs here.

  Started by the Playwright configs (`webServer`) on E2E_DOUBLES_PORT
  (default 3199); with port 0 the system picks one, and the first line on
  stdout names it. Also answers GET /health and GET /stats (how many checks
  it answered, so a spec can prove the server really asked).

  Plain Node, no dependency: the configs start it with `node`.
*/
import { createServer } from "node:http";

const DUMMY_TOKEN = "XXXX.DUMMY.TOKEN.XXXX";

const PASS = "1x0000000000000000000000000000000AA";
const FAIL = "2x0000000000000000000000000000000AA";
const SPENT = "3x0000000000000000000000000000000AA";

const stats = { verifications: 0, passed: 0 };

/** Cloudflare's answer for a secret and a token. */
function verdict(secret, token) {
  if (!secret)
    return { success: false, "error-codes": ["missing-input-secret"] };
  if (!token)
    return { success: false, "error-codes": ["missing-input-response"] };

  if (secret === PASS) {
    return token === DUMMY_TOKEN
      ? {
          success: true,
          "error-codes": [],
          challenge_ts: new Date().toISOString(),
          hostname: "localhost",
        }
      : { success: false, "error-codes": ["invalid-input-response"] };
  }

  if (secret === FAIL) {
    return { success: false, "error-codes": ["invalid-input-response"] };
  }

  if (secret === SPENT) {
    return { success: false, "error-codes": ["timeout-or-duplicate"] };
  }

  return { success: false, "error-codes": ["invalid-input-secret"] };
}

/** The form fields of a siteverify call (form-encoded, or JSON as Cloudflare also takes). */
function fieldsOf(body, contentType) {
  if ((contentType ?? "").includes("application/json")) {
    try {
      const parsed = JSON.parse(body);

      return { secret: parsed.secret, token: parsed.response };
    } catch {
      return { secret: undefined, token: undefined };
    }
  }

  const params = new URLSearchParams(body);

  return {
    secret: params.get("secret") ?? undefined,
    token: params.get("response") ?? undefined,
  };
}

function send(response, status, payload) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(payload));
}

const server = createServer((request, response) => {
  const path = new URL(request.url ?? "/", "http://double.local").pathname;

  if (request.method === "GET" && path === "/health") {
    send(response, 200, { ok: true });
    return;
  }

  if (request.method === "GET" && path === "/stats") {
    send(response, 200, stats);
    return;
  }

  if (request.method !== "POST" || path !== "/turnstile/v0/siteverify") {
    send(response, 404, { error: "not found" });
    return;
  }

  let body = "";

  request.setEncoding("utf8");
  request.on("data", (chunk) => {
    body += chunk;
  });
  request.on("end", () => {
    const { secret, token } = fieldsOf(body, request.headers["content-type"]);
    const answer = verdict(secret, token);

    stats.verifications += 1;
    if (answer.success) stats.passed += 1;

    send(response, 200, answer);
  });
});

const port = Number(process.env.E2E_DOUBLES_PORT ?? 3199);

server.listen(port, "127.0.0.1", () => {
  const address = server.address();

  console.log(
    `turnstile siteverify double listening on ${
      typeof address === "object" && address ? address.port : port
    }`,
  );
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
