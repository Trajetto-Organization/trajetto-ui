import { beforeEach, describe, expect, it } from "vitest";

import { clearSessionState } from "@/lib/clear-session-state";
import { queryClientProps } from "@/lib/query-client-props";

import { useAIVerificationStore } from "@/store/ai-verification-store";
import { useAuthStore } from "@/store/auth-store";

/**
 * User A logs out, user B logs in on the same tab, and B must not inherit a
 * single row of A's.
 *
 * What makes this worth a test rather than a code review is that nothing in
 * the app looks wrong: the QueryClient is built in a module body, so it
 * survives a logout that is a soft navigation, and `<QueryClientProvider>`
 * unmounting does not empty a QueryCache. The keys do not save it either —
 * none of them carries a user id, so two people at the same carrier share
 * `["chat-threads", businessId, search]` exactly, and a few keys have no scope
 * at all.
 */
const BUSINESS = "018f0000-0000-7000-8000-00000000000b";

// The worst of the real keys, taken from the app: a conversation list scoped
// only by carrier, a receivables search scoped by nothing, and a driver list.
const CHAT_THREADS = ["chat-threads", BUSINESS, ""];
const ACCOUNT_PAYABLES = ["account-payables-by-responsible-user"];
const DRIVERS = ["driver", BUSINESS];

function signInAsUserA(): void {
  queryClientProps.setQueryData(CHAT_THREADS, [
    { id: "t1", driverName: "João", lastMessage: "Cheguei na doca 3" },
  ]);

  queryClientProps.setQueryData(ACCOUNT_PAYABLES, [
    { id: "ap1", supplier: "Posto Ipiranga", amount: 4210.55 },
  ]);

  queryClientProps.setQueryData(DRIVERS, [{ id: "d1", name: "João" }]);

  useAIVerificationStore.getState().updateVerification({
    recordId: "fine-1",
    status: "COMPLETED",
  } as never);

  useAIVerificationStore.getState().updateBusinessUsage(BUSINESS, {
    used: 12,
    limit: 50,
  } as never);

  useAuthStore.getState().setAuth({
    id: "user-a",
    businessId: BUSINESS,
    role: "BUSINESS_ADMIN",
    permissions: [
      { permissionKey: "delivery", canRead: true, canWrite: true },
    ] as never,
    enabledModules: ["DELIVERIES"],
  });
}

beforeEach(() => {
  queryClientProps.clear();
  useAIVerificationStore.getState().clearAll();
});

describe("what user A leaves behind in the tab", () => {
  it("is really there before anyone clears it", () => {
    // Guards the test itself: if seeding silently failed, every assertion
    // below would pass against an already-empty cache and prove nothing.
    signInAsUserA();

    expect(queryClientProps.getQueryData(CHAT_THREADS)).toBeDefined();
    expect(queryClientProps.getQueryData(ACCOUNT_PAYABLES)).toBeDefined();
    expect(queryClientProps.getQueryCache().getAll().length).toBeGreaterThan(0);
    expect(useAIVerificationStore.getState().verifications.size).toBe(1);
    expect(useAuthStore.getState().id).toBe("user-a");
  });
});

describe("after clearSessionState", () => {
  beforeEach(() => {
    signInAsUserA();
    clearSessionState();
  });

  it("leaves no conversations for the next user", () => {
    expect(queryClientProps.getQueryData(CHAT_THREADS)).toBeUndefined();
  });

  it("leaves no receivables", () => {
    expect(queryClientProps.getQueryData(ACCOUNT_PAYABLES)).toBeUndefined();
  });

  it("leaves no administrative lists", () => {
    expect(queryClientProps.getQueryData(DRIVERS)).toBeUndefined();
  });

  it("empties the cache entirely rather than one key at a time", () => {
    // The point of clear() over removeQueries: this has to hold for keys
    // nobody remembered to list, including ones added after this was written.
    expect(queryClientProps.getQueryCache().getAll()).toHaveLength(0);
  });

  it("removes the data instead of marking it stale", () => {
    // invalidateQueries would leave the rows in place and merely schedule a
    // refetch — and react-query renders stale data while that runs, so the
    // new user would see the old user's rows for the length of a request.
    const remaining = queryClientProps
      .getQueryCache()
      .getAll()
      .filter((query) => query.state.data !== undefined);

    expect(remaining).toHaveLength(0);
  });

  it("empties the AI verification store, which nothing used to clear", () => {
    expect(useAIVerificationStore.getState().verifications.size).toBe(0);
    expect(useAIVerificationStore.getState().businessUsage.size).toBe(0);
  });

  it("drops the previous user's role and permissions", () => {
    const auth = useAuthStore.getState();

    expect(auth.id).toBeNull();
    expect(auth.role).toBeNull();
    expect(auth.permissions).toEqual([]);
    expect(auth.enabledModules).toBeNull();
  });

  it("drops the previous user's carrier", () => {
    // businessId was missing from logout()'s reset. Anything reading the store
    // between a logout and the next setAuth — a menu, a permission gate, a
    // query key built from it — saw the previous carrier.
    expect(useAuthStore.getState().businessId).toBeNull();
  });
});
