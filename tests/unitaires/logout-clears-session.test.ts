import * as React from "react";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider, useQuery } from "react-query";

import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

/**
 * "Sair", pressed by user A on a tab that user B will use next (decision 2.6,
 * §9/§14 of the phase contract: "logar e deslogar sem pegadinhas").
 *
 * Only the login page used to clear the tab, and logging out was a soft
 * navigation that kept the tab's memory. The first fix emptied the cache and
 * stores as soon as the action answered, with the protected tree still on
 * screen: its next render rebuilt every query and fired it again, with no
 * credential, on the way out. And it read any `undefined` as success — also
 * the answer of a tab from an older build whose action id no longer exists,
 * when nothing was logged out: the tab was emptied, the cookie stayed valid
 * and no redirect came.
 *
 * The server action is the one thing replaced: it deletes cookies over HTTP.
 */
const handleLogout = vi.fn(
  async (): Promise<{ loggedOut?: true; logoutError?: string } | undefined> =>
    undefined,
);

vi.mock("@/actions/user/logout-user", () => ({
  handleLogout: () => handleLogout(),
}));

const disconnectSocket = vi.fn();

vi.mock("@/socket", () => ({
  disconnectSocket: () => disconnectSocket(),
}));

import { logOutUser } from "@/app/(protected)/_components/layout/protected-account-settings/hooks";
import { queryClientProps } from "@/lib/query-client-props";
import { useAuthStore } from "@/store/auth-store";

const BUSINESS = "018f0000-0000-7000-8000-00000000000b";

let assigned: string[] = [];

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal("React", React);
});

function signInAsUserA(): void {
  useAuthStore.getState().setAuth({
    id: "user-a",
    businessId: BUSINESS,
    role: "BUSINESS_ADMIN",
    permissions: [],
    enabledModules: ["DELIVERIES"],
  });
}

beforeEach(() => {
  handleLogout.mockReset();
  disconnectSocket.mockClear();
  sessionStorage.clear();
  queryClientProps.clear();
  assigned = [];

  // happy-dom refuses a real navigation; where the tab goes is under test.
  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      href: "http://localhost/dashboard/deliveries",
      assign: (url: string) => assigned.push(url),
    },
  });

  signInAsUserA();
});

const unmounts: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (unmounts.length) await unmounts.pop()!();
});

let requests = 0;

/**
 * A panel of the protected tree: gated on the role, reading a list — the
 * shape of most screens behind the "Sair" menu.
 */
async function mountProtectedPanel(): Promise<void> {
  requests = 0;

  const Panel = () => {
    const role = useAuthStore((state) => state.role);

    useQuery(["shipper", BUSINESS], async () => {
      requests += 1;
      return [{ id: "s1" }];
    });

    return createElement("span", null, role ?? "");
  };

  const root = createRoot(document.createElement("div"));

  await act(async () => {
    root.render(
      createElement(
        QueryClientProvider,
        { client: queryClientProps },
        createElement(Panel),
      ),
    );
  });

  unmounts.push(async () => act(async () => root.unmount()));
}

async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((done) => setTimeout(done, 30));
  });
}

describe("a successful logout", () => {
  beforeEach(() => {
    handleLogout.mockResolvedValue({ loggedOut: true });
  });

  it("leaves with a full load, which drops the tab's cache and stores with the document", async () => {
    await logOutUser();

    expect(assigned).toEqual(["/login?reason=logout"]);
  });

  it("does not make the screen it is leaving ask the API again", async () => {
    await mountProtectedPanel();
    await settle();
    expect(requests).toBe(1);

    await logOutUser();
    await settle();

    expect(
      requests,
      "a tela que estava saindo refez a consulta sem credencial",
    ).toBe(1);
  });

  it("clears what outlives the document: the persisted role", async () => {
    await logOutUser();

    expect(localStorage.getItem("auth-store") ?? "").not.toContain("user-a");
  });

  it("closes the socket, so nothing of the old session lands meanwhile", async () => {
    await logOutUser();

    expect(disconnectSocket).toHaveBeenCalledTimes(1);
  });

  it("leaves the login page its note", async () => {
    await logOutUser();

    expect(sessionStorage.getItem("pending_login_toast")).toBe("true");
  });
});

describe("an answer this tab cannot read", () => {
  it("still logs out, through the middleware that deletes the cookies", async () => {
    // A tab from before a deploy: the action id is gone and Next answers
    // `undefined`. The server did nothing, so the cookie is still valid.
    handleLogout.mockResolvedValue(undefined);

    await logOutUser();

    expect(assigned).toEqual(["/login?force_logout=true&error=logout"]);
    expect(disconnectSocket).toHaveBeenCalledTimes(1);
  });
});

describe("a logout the server refused", () => {
  it("keeps the session as it was, stays on the page and says why", async () => {
    queryClientProps.setQueryData(
      ["chat-threads", BUSINESS, ""],
      [{ id: "t1" }],
    );
    handleLogout.mockResolvedValue({ logoutError: "Tente novamente." });

    const state = await logOutUser();

    expect(state).toEqual({ logoutError: "Tente novamente." });
    expect(assigned).toEqual([]);
    expect(
      queryClientProps.getQueryData(["chat-threads", BUSINESS, ""]),
    ).toBeDefined();
    expect(useAuthStore.getState().role).toBe("BUSINESS_ADMIN");
    expect(disconnectSocket).not.toHaveBeenCalled();

    // No "você saiu" on the next visit to /login.
    expect(sessionStorage.getItem("pending_login_toast")).toBeNull();
  });
});
