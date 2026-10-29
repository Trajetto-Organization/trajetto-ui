// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  clientPathShapes,
  missingRoutes,
} from "../../scripts/check-api-routes.mjs";

/**
 * The web promoted ahead of the API it calls.
 *
 * UI and API ship through two separate promote buttons with nothing between
 * them. A web build that calls a route the production API does not serve yet
 * (or no longer serves) answered 404 on that screen until the other side
 * caught up — the fine that could not be deleted was exactly this. The
 * promote job now compares what the build calls with the production API's
 * OpenAPI document before moving `stable`.
 */
describe("clientPathShapes", () => {
  it("reads the API paths the server code builds, one segment per placeholder", () => {
    const shapes = clientPathShapes([
      {
        path: "src/actions/fine/delete-fine/index.ts",
        source:
          "await fetch(`${process.env.HTTP_REQUEST}/fines/delete-fine/${fineId}/business/${businessId}`, {",
      },
      {
        path: "src/socket.ts",
        source:
          "const url = `${process.env.NEXT_PUBLIC_HTTP_REQUEST}/deliveries?page=${page}&x=1`;",
      },
      {
        path: "src/x.ts",
        source: "fetch(`https://viacep.com.br/ws/${cep}/json`)",
      },
    ]);

    expect([...shapes.keys()].sort()).toEqual([
      "/deliveries",
      "/fines/delete-fine/SEG/business/SEG",
    ]);
  });

  // Browser code reads the API URL at run time (decision 12.2); the check
  // must keep seeing the paths it calls, or a route removed from the API
  // would no longer block the promote.
  it("reads the paths browser code builds from the run-time API URL", () => {
    const shapes = clientPathShapes([
      {
        path: "src/hooks/x.ts",
        source:
          "await fetch(`${await publicApiUrl()}/kanban/list/${businessId}?${params.toString()}`)",
      },
    ]);

    expect([...shapes.keys()]).toEqual(["/kanban/list/SEG"]);
  });

  // Since the page holds no token, browser reads go through the same-origin
  // relay; the paths it forwards must still block a promote.
  it("reads the paths browser code sends through the relay", () => {
    const shapes = clientPathShapes([
      {
        path: "src/hooks/y.ts",
        source:
          'fetch(relayUrl(`/kanban/list/${encodeURIComponent(id)}`, params)); fetch(relayUrl("/user/me"));',
      },
    ]);

    expect([...shapes.keys()].sort()).toEqual(["/kanban/list/SEG", "/user/me"]);
  });

  it("finds every browser call in this repository's source", () => {
    const sources = [
      "src/app/(protected)/_components/kanban/board-provider/hooks/kanban-infinite-scroll.ts",
      "src/app/(protected)/_components/layout/hooks/navigation-security-check.ts",
      "src/lib/notification-stream.ts",
    ].map((path) => ({
      path,
      source: readFileSync(resolve(process.cwd(), path), "utf8"),
    }));

    expect([...clientPathShapes(sources).keys()].sort()).toEqual([
      "/kanban/list/SEG",
      "/notification/stream",
      "/user/me",
    ]);
  });
});

describe("missingRoutes", () => {
  const calls = new Map([
    [
      "/fines/delete-fine/SEG/business/SEG",
      "src/actions/fine/delete-fine/index.ts:12",
    ],
    ["/deliveries", "src/actions/delivery/index.ts:3"],
  ]);

  it("reports a path the API does not document", () => {
    const docs = {
      paths: { "/deliveries": {}, "/fines/delete-fine/{fineId}": {} },
    };

    expect(missingRoutes(calls, docs)).toEqual([
      "/fines/delete-fine/SEG/business/SEG  (src/actions/fine/delete-fine/index.ts:12)",
    ]);
  });

  it("reports nothing when every path has a route", () => {
    const docs = {
      paths: {
        "/deliveries/": {},
        "/fines/delete-fine/{fineId}/business/{businessId}": {},
      },
    };

    expect(missingRoutes(calls, docs)).toEqual([]);
  });

  it("refuses a document with no paths rather than passing everything", () => {
    expect(() => missingRoutes(calls, { paths: {} })).toThrow();
    expect(() => missingRoutes(calls, {})).toThrow();
  });
});

describe("the promote job", () => {
  it("checks the API before it moves `stable`", () => {
    const workflow = readFileSync(
      resolve(process.cwd(), ".github", "workflows", "deploy.yml"),
      "utf8",
    );

    const check = workflow.indexOf("node scripts/check-api-routes.mjs");
    const promote = workflow.indexOf("- name: Promote image to stable");

    expect(check).toBeGreaterThan(-1);
    expect(check).toBeLessThan(promote);
    expect(workflow.slice(0, check)).toContain("promote-production:");
  });
});
