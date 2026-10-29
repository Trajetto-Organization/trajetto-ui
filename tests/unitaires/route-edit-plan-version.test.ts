import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Editing a route from its page sends the plan version it was opened on
 * (decision 14.7, D5, §4.8), and a 409 ROUTE_PLAN_STALE comes back with its
 * code so the page can reload instead of a silent last-write-wins.
 *
 * The real server action, with only the network and the cookie mocked.
 */
vi.mock("@/actions/cookies", () => ({ getCookies: async () => "token" }));
vi.mock("@/lib/log-action-error", () => ({ logActionError: () => {} }));

import { handleUpdateRoute } from "@/actions/route/update-route";

const fetchMock = vi.fn();

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

function form(fields: Record<string, string>): FormData {
  const data = new FormData();

  for (const [key, value] of Object.entries(fields)) data.append(key, value);

  return data;
}

const reply = (status: number, body: Record<string, unknown>) => ({
  ok: status < 400,
  status,
  json: async () => body,
});

describe("editing a route with the plan version (review r1)", () => {
  it("sends expectedPlanVersion and surfaces the stale-plan code", async () => {
    // Red before: the body had no expectedPlanVersion and the error no code.
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue(
      reply(409, {
        message: "Outra pessoa alterou esta rota enquanto você editava.",
        code: "ROUTE_PLAN_STALE",
      }),
    );

    const answer = await handleUpdateRoute(
      {},
      form({
        businessId: "b",
        routeId: "r1",
        name: "Zona Norte",
        changed_fields: "name",
        expected_plan_version: "4",
      }),
    );

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);

    expect(body).toEqual({ name: "Zona Norte", expectedPlanVersion: 4 });
    expect(answer).toEqual({
      updateRouteError: {
        updateRouteErrorMessage:
          "Outra pessoa alterou esta rota enquanto você editava.",
        code: "ROUTE_PLAN_STALE",
      },
    });
  });

  it("sends no version when the dialog had none", async () => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue(reply(200, { message: "Rota atualizada." }));

    await handleUpdateRoute(
      {},
      form({
        businessId: "b",
        routeId: "r1",
        name: "Zona Norte",
        changed_fields: "name",
      }),
    );

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);

    expect(body).not.toHaveProperty("expectedPlanVersion");
  });
});
